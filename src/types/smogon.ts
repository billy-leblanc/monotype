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
  Spreads: Record<string, number>; // "Nature:HP/Atk/Def/SpA/SpD/Spe"
  Teammates: Record<string, number>;
  "Checks and Counters": Record<string, [number, number, number]>; // [KOed, Switched out, Total] -> wait, it's usually array of 3 numbers indicating relative viability
  "Raw count": number;
  usage?: number; // Calculated later based on total battles * 12 (or total roster size) or using raw count
  viability?: number[]; // [KOed/Switched, etc]
}

export interface ParsedPokemon {
  name: string;
  usagePct: number;
  rawCount: number;
  topMoves: Array<{ name: string; pct: number }>;
  topItems: Array<{ name: string; pct: number }>;
  topAbilities: Array<{ name: string; pct: number }>;
  topSpreads: Array<{ name: string; pct: number }>;
  topTeammates: Array<{ name: string; pct: number }>;
  counters: Array<{ name: string; score: number; koPct: number; switchPct: number }>;
}
