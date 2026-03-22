import axios from 'axios';
import { Dex } from '@pkmn/dex';

async function analyze() {
  const datesToTry = ['2026-02', '2026-01', '2025-12', '2025-11', '2024-05'];
  let data = null;
  let dateUsed = null;
  for (const date of datesToTry) {
    try {
      const url = `https://www.smogon.com/stats/${date}/chaos/gen9monotype-1630.json`;
      console.log('Fetching', url);
      const res = await axios.get(url);
      data = res.data;
      dateUsed = date;
      break;
    } catch (e) {
      console.log(`Failed ${date}:`, e.message);
    }
  }

  if (!data) return console.error('Could not fetch data');

  const pokemonData = data.data;
  let typeCounts = {};
  let mostPlayedPokemon = []; 

  for (const [name, stats] of Object.entries(pokemonData)) {
    const rawCount = stats['Raw count'];
    if (rawCount < 10) continue; // ignore noise

    const species = Dex.species.get(name);
    let types = [];
    if (species && species.exists) {
      types = species.types;
    } else {
      const baseName = name.split('-')[0];
      const baseSpecies = Dex.species.get(baseName);
      if (baseSpecies && baseSpecies.exists) {
        types = baseSpecies.types;
      }
    }

    if (!types || types.length === 0) {
      continue;
    }

    mostPlayedPokemon.push({ name, rawCount, types });

    const weight = rawCount / types.length;
    for (const t of types) {
      typeCounts[t] = (typeCounts[t] || 0) + weight;
    }
  }

  mostPlayedPokemon.sort((a, b) => b.rawCount - a.rawCount);

  const sortedTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count: Math.round(count) }));

  console.log('\n--- Top Types ---');
  sortedTypes.forEach(t => console.log(`${t.type}: ${t.count}`));

  console.log('\n--- Top 10 Pokemon ---');
  mostPlayedPokemon.slice(0, 10).forEach(p => console.log(`${p.name}: ${p.rawCount} (Types: ${p.types.join(', ')})`));
}

analyze();
