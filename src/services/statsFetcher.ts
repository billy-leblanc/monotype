import type { MonotypeData } from '../types/smogon';

const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours

export async function fetchStats(elo: '1500' | '1630' | '1760' = '1760'): Promise<MonotypeData> {
  const DATA_URL = `/data/meta-${elo}.json`;
  const CACHE_KEY = `monotype_chaos_data_${elo}_v6_compiled`;

  try {
    const cachedItem = localStorage.getItem(CACHE_KEY);
    if (cachedItem) {
      const { timestamp, data } = JSON.parse(cachedItem);
      if (Date.now() - timestamp < CACHE_TIME) {
        return data as MonotypeData;
      }
    }

    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`Compiled stats file for ${elo} not found`);
    const data: MonotypeData = await res.json();
    
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch (e) {
      console.warn("Could not cache in localStorage", e);
    }
    
    return data;
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return { pokemon: [], teams: {}, typeUsage: [], leads: {}, matchups: {} };
  }
}
