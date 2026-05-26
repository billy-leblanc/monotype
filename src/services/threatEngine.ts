import { calculate, Move, Pokemon, Generations } from '@smogon/calc';
import type { ParsedPokemon, MatchupThreat, ThreatVictim } from '../types/smogon';

const gen = Generations.get(9);

// How many mons (by usage) of each side to consider. Keeps the calc bounded & fast.
const MAX_ATTACKERS = 14;
const MAX_DEFENDERS = 12;
const MAX_MOVES = 4;
const MAX_THREATS = 8;
const MAX_VICTIMS = 4;

function parseSpread(s?: string): { nature: string; evs: Record<string, number> } {
  if (!s || !s.includes(':')) return { nature: s || 'Hardy', evs: {} };
  const [nature, evstr] = s.split(':');
  if (!evstr) return { nature: nature || 'Hardy', evs: {} };
  const [hp, atk, def, spa, spd, spe] = evstr.split('/').map(Number);
  return { nature: nature || 'Hardy', evs: { hp, atk, def, spa, spd, spe } };
}

// EVs+nature to use for a defender. Default = the single most-used set.
// Bulky mode: use the mon's bulkiest *real* spread if it actually invests defensively;
// otherwise synthesize a standard 252 HP / split-defense benchmark so purely-offensive
// mons (e.g. Dragapult, which only runs max-Atk sets) still get a meaningful "what if
// I ran bulk" comparison instead of looking identical to the offensive view.
const DEFENSIVE_EV_FLOOR = 200; // hp+def+spd investment below this counts as "not actually bulky"
const SYNTH_BULK = { nature: 'Hardy', evs: { hp: 252, atk: 0, def: 128, spa: 0, spd: 128, spe: 0 } };

function defenderSpread(p: ParsedPokemon, preferBulky: boolean): { nature: string; evs: Record<string, number> } {
  const spreads = p.topSpreads.slice(0, 6);
  const mostUsed = parseSpread(spreads[0]?.name);
  if (!preferBulky) return mostUsed;

  let best = mostUsed;
  let bestScore = -1;
  for (const s of spreads) {
    const sp = parseSpread(s.name);
    const score = (sp.evs.hp ?? 0) + (sp.evs.def ?? 0) + (sp.evs.spd ?? 0);
    if (score > bestScore) {
      bestScore = score;
      best = sp;
    }
  }
  return bestScore >= DEFENSIVE_EV_FLOOR ? best : SYNTH_BULK;
}

function buildPokemon(p: ParsedPokemon, preferBulky = false): Pokemon | null {
  const sp = preferBulky
    ? defenderSpread(p, true)
    : parseSpread(p.topSpreads[0]?.name);
  try {
    return new Pokemon(gen, p.name, {
      item: p.topItems[0]?.name,
      ability: p.topAbilities[0]?.name,
      nature: sp.nature,
      evs: sp.evs,
    });
  } catch {
    return null;
  }
}

function damagingMoves(p: ParsedPokemon): Move[] {
  const moves: Move[] = [];
  for (const m of p.topMoves.slice(0, 6)) {
    if (moves.length >= MAX_MOVES) break;
    try {
      const mv = new Move(gen, m.name);
      if (mv.category !== 'Status' && (mv.bp ?? 0) > 0) moves.push(mv);
    } catch {
      /* unknown move id — skip */
    }
  }
  return moves;
}

// Severity of a single best-move result: 1 = clean OHKO, scaling down for slower KOs / chip.
function severityOf(n: number, chance: number, pctMax: number): number {
  if (n === 1) return Math.max(chance, 0.85);
  if (n === 2) return 0.55 * Math.max(chance, 0.6);
  if (n === 3) return 0.28;
  return Math.min(pctMax / 100, 0.2); // can't reliably KO — only chip pressure
}

/**
 * For a given matchup (yourType defending vs oppType attacking), rank the opponent's
 * Pokémon by how much they threaten YOUR most-used mons — weighted by both sides' usage.
 * This is the "cause" behind the type win% "correlation": the actual mons doing the work.
 */
export function computeMatchupThreats(
  yourType: string,
  oppType: string,
  all: ParsedPokemon[],
  opts: { bulkyDefenders?: boolean } = {}
): MatchupThreat[] {
  // `all` is sorted by usage desc globally, so filtering preserves usage order.
  const defenders = all.filter((p) => p.types.includes(yourType)).slice(0, MAX_DEFENDERS);
  const attackers = all.filter((p) => p.types.includes(oppType)).slice(0, MAX_ATTACKERS);
  if (!defenders.length || !attackers.length) return [];

  const builtDefenders = defenders
    .map((p) => ({ data: p, mon: buildPokemon(p, opts.bulkyDefenders) }))
    .filter((d): d is { data: ParsedPokemon; mon: Pokemon } => d.mon !== null);

  const threats: MatchupThreat[] = [];

  for (const atk of attackers) {
    const attacker = buildPokemon(atk);
    if (!attacker) continue;
    const moves = damagingMoves(atk);
    if (!moves.length) continue;

    const victims: ThreatVictim[] = [];

    for (const def of builtDefenders) {
      const maxHP = def.mon.maxHP();
      let best: ThreatVictim | null = null;

      for (const mv of moves) {
        let result;
        try {
          result = calculate(gen, attacker, def.mon, mv);
        } catch {
          continue;
        }
        const dmg = result.range();
        const maxDmg = Array.isArray(dmg) ? dmg[1] : dmg;
        if (!maxDmg || maxDmg <= 0) continue; // immune / no damage — not a threat with this move
        const pctMax = (maxDmg / maxHP) * 100;
        // kochance() throws on 0-damage rolls, so guard it.
        let ko: { n: number; chance?: number; text?: string } = { n: 0, chance: 0 };
        try {
          ko = result.kochance();
        } catch {
          ko = { n: 0, chance: 0 };
        }
        const n = ko.n || (pctMax >= 100 ? 1 : 0);
        const chance = ko.chance ?? 0;
        const severity = severityOf(n, chance, pctMax);
        if (!best || severity > best.severity) {
          best = {
            yourMon: def.data.name,
            move: mv.name,
            koText: ko.text || `${pctMax.toFixed(0)}% max`,
            n,
            chance,
            pctMax,
            severity,
          };
        }
      }

      // Only count it as "threatening" this mon if it can realistically pressure it.
      if (best && best.severity >= 0.25) {
        // weight the harm by how common the victim is
        victims.push({ ...best, severity: best.severity * (0.5 + def.data.usagePct / 20) });
      }
    }

    if (!victims.length) continue;
    victims.sort((a, b) => b.severity - a.severity);
    const rawScore = victims.reduce((s, v) => s + v.severity, 0);
    const score = rawScore * (0.4 + atk.usagePct / 15); // weight by attacker usage too

    threats.push({
      oppMon: atk.name,
      oppUsage: atk.usagePct,
      score,
      sharePct: 0,
      victims: victims.slice(0, MAX_VICTIMS),
    });
  }

  threats.sort((a, b) => b.score - a.score);
  const top = threats.slice(0, MAX_THREATS);
  const total = top.reduce((s, t) => s + t.score, 0) || 1;
  for (const t of top) t.sharePct = (t.score / total) * 100;
  return top;
}
