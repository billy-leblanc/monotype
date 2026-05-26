export interface ChaosData {
  info: {
    metagame: string;
    cutoff: number;
    "cutoff deviation": number;
    "team type": null | string;
    "number of battles": number;
  };
  data: Record<string, PokemonStats>;
}

export interface PokemonStats {
  Moves: Record<string, number>;
  Items: Record<string, number>;
  Abilities: Record<string, number>;
  Spreads: Record<string, number>;
  Teammates: Record<string, number>;
  "Checks and Counters": Record<string, [number, number, number]>;
  "Raw count": number;
}

export interface ParsedPokemon {
  name: string;
  types: string[];
  usagePct: number;
  rawCount: number;
  topMoves: Array<{ name: string; pct: number }>;
  topItems: Array<{ name: string; pct: number }>;
  topAbilities: Array<{ name: string; pct: number }>;
  topSpreads: Array<{ name: string; pct: number }>;
  topTeammates: Array<{ name: string; pct: number }>;
  counters: Array<{ name: string; score: number; koPct: number; switchPct: number; types: string[] }>;
}

export interface ExtractedTeam {
  id: string;
  members: string[];
  score: number;
  primaryType: string;
}

export interface TypeUsage {
  type: string;
  count: number;
}

export interface TopLead {
  pokemon: string;
  usagePct: number;
  rawCount: number;
}

export interface MatchupEntry {
  opponentType: string;
  winPct: number;
}

export interface ThreatVictim {
  yourMon: string;
  move: string;
  koText: string;
  n: number;        // hits to KO (1 = OHKO, 2 = 2HKO ...)
  chance: number;   // KO probability 0-1
  pctMax: number;   // max damage as % of defender HP
  severity: number; // internal weight 0-1
}

export interface MatchupThreat {
  oppMon: string;
  oppUsage: number;
  score: number;        // usage-weighted threat score (relative)
  sharePct: number;     // share of total matchup threat, for display
  victims: ThreatVictim[];
}

export interface MonotypeData {
  pokemon: ParsedPokemon[];
  teams: Record<string, ExtractedTeam[]>;
  typeUsage: TypeUsage[];
  leads: Record<string, TopLead[]>;
  matchups: Record<string, MatchupEntry[]>;
}
