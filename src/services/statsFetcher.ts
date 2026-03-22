import type { ChaosData, ParsedPokemon } from '../types/smogon';

// Smogon Gen9 Monotype usage stats API
const DATA_URL = '/api/smogon/stats/2026-02/chaos/gen9monotype-1630.json';
const CACHE_KEY = 'monotype_chaos_data';
const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours

export async function fetchStats(): Promise<ParsedPokemon[]> {
  try {
    // Check local storage for quick load
    const cachedItem = localStorage.getItem(CACHE_KEY);
    if (cachedItem) {
      const { timestamp, data } = JSON.parse(cachedItem);
      if (Date.now() - timestamp < CACHE_TIME) {
        return data;
      }
    }

    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const rawData: ChaosData = await response.json();
    const parsed = parseChaosData(rawData);
    
    // Attempt caching, but catch quota errors
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: parsed
      }));
    } catch (e) {
      console.warn("Could not cache in localStorage (likely size limit)", e);
    }
    
    return parsed;
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return [];
  }
}

function parseChaosData(data: ChaosData): ParsedPokemon[] {
  const result: ParsedPokemon[] = [];
  const totalBattles = data.info["number of battles"];
  
  // To avoid dividing by zero or having low sample sizes
  const minRawCount = 10; 

  Object.entries(data.data).forEach(([name, stats]) => {
    if (stats["Raw count"] < minRawCount) return;

    // Convert objects to sorted arrays
    const topMoves = getTopEntries(stats.Moves);
    const topItems = getTopEntries(stats.Items);
    const topAbilities = getTopEntries(stats.Abilities);
    const topSpreads = getTopEntries(stats.Spreads);
    const topTeammates = getTopEntries(stats.Teammates);
    
    // Sort counters
    const counters = Object.entries(stats["Checks and Counters"])
      .map(([counterName, payload]) => {
        // [koed, switched out, total fights]
        // Often payload has 3 values. It varies slightly between generations, 
        // typically [score, ko_pct, switch_pct] or similar based on Smogon definitions
        // But for display, let's assume index 0 is Score, index 1 is KO%, index 2 is Switch%
        return {
          name: counterName,
          score: payload[0] ?? 0,
          koPct: payload[1] ?? 0,
          switchPct: payload[2] ?? 0
        };
      })
      .sort((a, b) => (b.koPct + b.switchPct) - (a.koPct + a.switchPct))
      .slice(0, 10); // Top 10 counters

    // Estimate usage percent (raw count / total teams)*100
    // roughly 12 Pokemon per battle (6 per team)
    const teams = totalBattles * 2;
    const usagePct = (stats["Raw count"] / teams) * 100;

    result.push({
      name,
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

  // Sort by highest usage first
  return result.sort((a, b) => b.usagePct - a.usagePct);
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
