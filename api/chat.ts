import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { calculate, Pokemon, Move, Generations } from '@smogon/calc';

export const runtime = 'edge';

const gen = Generations.get(9);
// Edge functions are stateless but top-level vars can persist in warm starts
const calcCache = new Map<string, string>();

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  
  try {
    const { messages, pokemonContext, userTeamContext } = await req.json();

    const isLogSync = messages[messages.length - 1].content.startsWith('BATTLE_LOG_SYNC:');

    let sysPrompt = `You are an elite competitive Pokemon Showdown coach. Be concise, highly accurate, and use competitive terminology.
    
    USER'S CUSTOM TEAM:
    ${JSON.stringify(userTeamContext || [])}

    META DATABASE (Top 75 Pokemon):
    ${JSON.stringify(pokemonContext || [])}

    CRITICAL INSTRUCTION: If the user asks you to calculate damage (e.g. "Can X OHKO Y?", "How much does X do to Y?", etc), YOU MUST NOT attempt to do the math yourself. You MUST reply with exactly ONE JSON block in the following format, and NOTHING else:
    \`\`\`json
    { "CALCULATE": { "attackerName": "...", "defenderName": "...", "moveName": "...", "attackerItem": "...", "defenderItem": "...", "attackerStrEVs": "...", "defenderStrEVs": "...", "attackerBoosts": {"atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0}, "defenderBoosts": {"atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0} } }
    \`\`\`
    
    HOW TO DETERMINE STATS:
    1. If a Pokemon is in the USER'S CUSTOM TEAM, ALWAYS use those specific EVs, Nature, and Item.
    2. If a Pokemon is NOT in the user's team, assume the standard competitive sets from the META DATABASE.
    3. If the user specifies stat changes (e.g. "+2 Atk", "Swords Dance"), map them as integers (-6 to 6) in the Boosts objects.
    4. If the user omits a move, default to their strongest STAB.`;

    if (isLogSync) {
      sysPrompt = `You are a Battle Log Parser. Your job is to read the provided Pokemon Showdown battle log and return the current revealed state of the OPPONENT'S team.
      Return exactly ONE JSON block in this format:
      \`\`\`json
      { "BATTLE_STATE": [ { "name": "...", "item": "revealed item or null", "ability": "revealed ability or null", "moves": ["move1", "move2"], "evDeductions": "Analyze damage dealt/taken in the log to guess their set (e.g. 'Likely Choice Specs' or 'Max Speed')" } ] }
      \`\`\`
      Focus ONLY on revealing the opponent's 6 Pokemon based on the log. If a Pokemon hasn't appeared yet, don't include it. If an item/ability hasn't been revealed, use null.`;
    }

    const result = await generateText({
      model: google('gemini-flash-latest'),
      system: sysPrompt,
      messages,
    });

    let finalContent = result.text;
    let battleState = null;
    
    // Natively intercept JSON block since Vercel's Tool wrapper is broken for Gemini 2.5
    try {
      const calcMatch = finalContent.match(/```json\s*(\{[\s\S]*?"CALCULATE"[\s\S]*?\})\s*```/);
      const stateMatch = finalContent.match(/```json\s*(\{[\s\S]*?"BATTLE_STATE"[\s\S]*?\})\s*```/);

      if (stateMatch) {
         battleState = JSON.parse(stateMatch[1]).BATTLE_STATE;
         finalContent = "Battle state updated.";
      } else if (calcMatch) {
        const payload = JSON.parse(calcMatch[1]).CALCULATE;

        // Cache Check
        const cacheKey = `${payload.attackerName}-${payload.defenderName}-${payload.moveName}-${payload.attackerItem}-${payload.defenderItem}-${payload.attackerBoosts?.atk || 0}-${payload.attackerBoosts?.def || 0}-${payload.attackerBoosts?.spa || 0}-${payload.attackerBoosts?.spd || 0}-${payload.attackerBoosts?.spe || 0}-${payload.defenderBoosts?.atk || 0}-${payload.defenderBoosts?.def || 0}-${payload.defenderBoosts?.spa || 0}-${payload.defenderBoosts?.spd || 0}-${payload.defenderBoosts?.spe || 0}`;
        if (calcCache.has(cacheKey)) {
          return new Response(JSON.stringify({
            role: 'assistant',
            content: calcCache.get(cacheKey),
            toolInvocations: []
          }), { headers: { 'Content-Type': 'application/json' } });
        }
        
        const parseEVs = (str: string) => {
          if (!str || str.trim() === '') return undefined;
          const [nature, evs] = str.split(':');
          if (!evs) return undefined;
          const [hp, atk, def, spa, spd, spe] = evs.split('/').map(Number);
          return { nature, evs: { hp, atk, def, spa, spd, spe } };
        };

        const attData = parseEVs(payload.attackerStrEVs);
        const defData = parseEVs(payload.defenderStrEVs);

        const attacker = new Pokemon(gen, payload.attackerName, { 
          item: payload.attackerItem || undefined, 
          nature: attData?.nature,
          evs: attData?.evs,
          boosts: payload.attackerBoosts || {}
        });
        const defender = new Pokemon(gen, payload.defenderName, { 
          item: payload.defenderItem || undefined, 
          nature: defData?.nature,
          evs: defData?.evs,
          boosts: payload.defenderBoosts || {}
        });
        const move = new Move(gen, payload.moveName);
        const calcMap = calculate(gen, attacker, defender, move);
        
        finalContent = `**Damage Calculation:**\n${calcMap.desc()}\n\n*This means it deals between ${Math.round((calcMap.range()[0] / defender.maxHP()) * 100)}% and ${Math.round((calcMap.range()[1] / defender.maxHP()) * 100)}% to ${payload.defenderName}!*`;
        
        // Save to cache
        calcCache.set(cacheKey, finalContent);
      }
    } catch (e) {
      console.log("Interceptor Parse Error:", e);
    }

    return new Response(JSON.stringify({
      role: 'assistant',
      content: finalContent || "The LLM returned a blank response.",
      battleState,
      toolInvocations: []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMsg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
