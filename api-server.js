import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { calculate, Pokemon, Move, Generations } from '@smogon/calc';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    dotenv.config(); // Fallback for production environments like Render
}

const app = express();

// 1. PRODUCTION CORS: Allow the app to be called from other domains
app.use(cors()); 
app.use(express.json());

// 2. PRODUCTION RATE LIMITER
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	limit: 300, 
	standardHeaders: 'draft-7',
	legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a few minutes!' }
});
app.use('/api/', limiter);

// Cache for damage calculations
const calcCache = new Map();
const gen = Generations.get(9);

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, pokemonContext, userTeamContext } = req.body;
    const isLogSync = messages[messages.length - 1].content.startsWith('BATTLE_LOG_SYNC:');
    
    let sysPrompt = `You are an elite competitive Pokemon Showdown coach (Professor Oak). Be concise and accurate.
    
    USER'S TEAM: ${JSON.stringify(userTeamContext || [])}
    META DATABASE: ${JSON.stringify(pokemonContext || [])}

    If asked for damage, return exactly one JSON block:
    \`\`\`json
    { "CALCULATE": { "attackerName": "...", "defenderName": "...", "moveName": "...", "attackerItem": "...", "defenderItem": "...", "attackerStrEVs": "...", "defenderStrEVs": "...", "attackerBoosts": {"atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0}, "defenderBoosts": {"atk": 0, "def": 0, "spa": 0, "spd": 0, "spe": 0} } }
    \`\`\``;

    if (isLogSync) {
      sysPrompt = `You are a Battle Log Parser. Return exactly:
      \`\`\`json
      { "BATTLE_STATE": [ { "name": "...", "item": "...", "ability": "...", "moves": ["..."], "evDeductions": "..." } ] }
      \`\`\``;
    }

    const result = await generateText({
      model: google('gemini-flash-latest'),
      system: sysPrompt,
      messages,
    });
    
    let finalContent = result.text;
    let battleState = null;
    
    try {
      const calcMatch = finalContent.match(/```json\s*(\{[\s\S]*?"CALCULATE"[\s\S]*?\})\s*```/);
      const stateMatch = finalContent.match(/```json\s*(\{[\s\S]*?"BATTLE_STATE"[\s\S]*?\})\s*```/);

      if (stateMatch) {
         battleState = JSON.parse(stateMatch[1]).BATTLE_STATE;
         finalContent = "Opponent team snapshot updated.";
      } else if (calcMatch) {
        const payload = JSON.parse(calcMatch[1]).CALCULATE;
        const cacheKey = JSON.stringify(payload);
        
        if (calcCache.has(cacheKey)) {
           return res.json({ role: 'assistant', content: calcCache.get(cacheKey), toolInvocations: [] });
        }

        const parseEVs = (str) => {
          if (!str || !str.includes(':')) return undefined;
          const [nature, evsText] = str.split(':');
          const evs = evsText.split('/').map(Number);
          return { nature, evs: { hp: evs[0], atk: evs[1], def: evs[2], spa: evs[3], spd: evs[4], spe: evs[5] } };
        };

        const att = parseEVs(payload.attackerStrEVs);
        const def = parseEVs(payload.defenderStrEVs);

        const attacker = new Pokemon(gen, payload.attackerName, { 
          item: payload.attackerItem || undefined, 
          nature: att?.nature,
          evs: att?.evs,
          boosts: payload.attackerBoosts || {}
        });
        const defender = new Pokemon(gen, payload.defenderName, { 
          item: payload.defenderItem || undefined, 
          nature: def?.nature,
          evs: def?.evs,
          boosts: payload.defenderBoosts || {}
        });
        const move = new Move(gen, payload.moveName);
        const calcMap = calculate(gen, attacker, defender, move);
        
        finalContent = `**Damage Calculation:**\n${calcMap.desc()}\n\n*Result: ${Math.round((calcMap.range()[0] / defender.maxHP()) * 100)}% - ${Math.round((calcMap.range()[1] / defender.maxHP()) * 100)}%*`;
        calcCache.set(cacheKey, finalContent);
      }
    } catch (e) {
      console.log("Parse error:", e);
    }

    return res.json({ role: 'assistant', content: finalContent, battleState, toolInvocations: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend live on port ${PORT}`);
    console.log(`API Key Detected: ${process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'YES ✅' : 'NO ❌'}`);
});
