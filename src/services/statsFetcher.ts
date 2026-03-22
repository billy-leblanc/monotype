import { Dex } from '@pkmn/dex';
import type { ChaosData, ParsedPokemon, ExtractedTeam, TypeUsage, MonotypeData } from '../types/smogon';

const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours

export async function fetchStats(elo: '1500' | '1630' | '1760' = '1760'): Promise<MonotypeData> {
  const DATA_URL = `/api/smogon/stats/2026-02/chaos/gen9monotype-${elo}.json`;
  const FALLBACK_URL = `/api/smogon/stats/2026-01/chaos/gen9monotype-${elo}.json`;
  const CACHE_KEY = `monotype_chaos_data_${elo}_v5`;

  try {
    const cachedItem = localStorage.getItem(CACHE_KEY);
    if (cachedItem) {
      const { timestamp, data } = JSON.parse(cachedItem);
      if (Date.now() - timestamp < CACHE_TIME) {
        return data;
      }
    }

    let rawData: ChaosData;
    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error(`${elo} not found`);
      rawData = await res.json();
    } catch {
      console.warn(`Falling back to 2026-01 for ${elo}`);
      const res2 = await fetch(FALLBACK_URL);
      rawData = await res2.json();
    }

    const parsed = parseChaosData(rawData);
    
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: parsed
      }));
    } catch (e) {
      console.warn("Could not cache in localStorage", e);
    }
    
    return parsed;
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return { pokemon: [], teams: {}, typeUsage: [] };
  }
}

function parseChaosData(data: ChaosData): MonotypeData {
  const result: ParsedPokemon[] = [];
  const totalBattles = data.info["number of battles"];
  const minRawCount = 10; 

  const typeMap: Record<string, number> = {};

  Object.entries(data.data).forEach(([name, stats]) => {
    if (stats["Raw count"] < minRawCount) return;

    let types: string[] = [];
    const species = Dex.species.get(name);
    if (species?.exists) {
      types = species.types;
    } else {
      const baseName = name.split('-')[0];
      const baseSpecies = Dex.species.get(baseName);
      if (baseSpecies?.exists) {
        types = baseSpecies.types;
      }
    }

    if (types.length === 0) types = ['Unknown'];

    const weight = stats["Raw count"] / types.length;
    for (const t of types) {
      if (t !== 'Unknown') {
        typeMap[t] = (typeMap[t] || 0) + weight;
      }
    }

    const topMoves = getTopEntries(stats.Moves);
    const topItems = getTopEntries(stats.Items);
    const topAbilities = getTopEntries(stats.Abilities);
    const topSpreads = getTopEntries(stats.Spreads);
    const topTeammates = getTopEntries(stats.Teammates);
    
    const counters = Object.entries(stats["Checks and Counters"])
      .map(([counterName, payload]) => ({
          name: counterName,
          score: payload[0] ?? 0,
          koPct: payload[1] ?? 0,
          switchPct: payload[2] ?? 0
      }))
      .sort((a, b) => (b.koPct + b.switchPct) - (a.koPct + a.switchPct))
      .slice(0, 10);

    const usagePct = (stats["Raw count"] / (totalBattles * 2)) * 100;

    result.push({
      name,
      types,
      usagePct,
      rawCount: stats["Raw count"],
      topMoves,
      topItems,
      topAbilities,
      topSpreads,
      topTeammates,
      counters,
    });
  });

  const pokemon = result.sort((a, b) => b.usagePct - a.usagePct);

  const typeUsage: TypeUsage[] = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count: Math.round(count) }));

  // Extract best teams looking for unique 6-mon combinations per shared type
  const teamsMap = new Map<string, ExtractedTeam>();
  
  for (const pkmn of pokemon) {
    const rawTeammates = data.data[pkmn.name]?.Teammates || {};
    
    for (const type of pkmn.types) {
      if (type === 'Unknown') continue;

      const teammatesOfType = Object.entries(rawTeammates)
        .filter(([tName]) => {
          let tTypes: string[] = [];
          const species = Dex.species.get(tName);
          if (species?.exists) tTypes = species.types;
          else {
            const baseName = tName.split('-')[0];
            const baseSpecies = Dex.species.get(baseName);
            if (baseSpecies?.exists) tTypes = baseSpecies.types;
          }
          return tTypes.includes(type);
        })
        .sort((a, b) => b[1] - a[1]) // highest shared count first
        .map(([tName]) => tName);

      if (teammatesOfType.length >= 5) {
        const top5 = teammatesOfType.slice(0, 5);
        const teamNames = [pkmn.name, ...top5];
        teamNames.sort();
        const id = teamNames.join('|');
        
        // Approximate score by the synergy count of its most common same-type teammate
        const topTeammateCount = rawTeammates[top5[0]];
        const typeScore = topTeammateCount || pkmn.rawCount / 2;

        if (!teamsMap.has(id)) {
          teamsMap.set(id, {
            id,
            members: teamNames,
            score: typeScore, 
            primaryType: type
          });
        }
      }
    }
  }

  const allTeams = Array.from(teamsMap.values()).sort((a, b) => b.score - a.score);
  const groupedTeams: Record<string, ExtractedTeam[]> = {};

  for (const team of allTeams) {
    if (!groupedTeams[team.primaryType]) {
      groupedTeams[team.primaryType] = [];
    }
    // Take top 2 unique combinations per type
    if (groupedTeams[team.primaryType].length < 2) {
      groupedTeams[team.primaryType].push(team);
    }
  }

  return { pokemon, teams: groupedTeams, typeUsage };
}

function getTopEntries(record: Record<string, number>, max = 10) {
  if (!record) return [];
  const total = Object.values(record).reduce((a, b) => a + b, 0);
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([name, count]) => ({
      name,
      pct: total > 0 ? (count / total) * 100 : 0
    }));
}
