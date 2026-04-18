import fs from 'fs';
import path from 'path';
import { Dex } from '@pkmn/dex';

const DATA_DIR = path.join(process.cwd(), '../smogon_monotype_stats');
const OUT_DIR = path.join(process.cwd(), 'public/data');
const ELOS = ['1500', '1630', '1760'];

const TYPE_NAMES = [
  'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel',
  'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy'
];

function getTopEntries(record, max = 10) {
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

function compileForElo(elo) {
  console.log(`\nCompiling for ELO ${elo}...`);
  
  // 1. Parse Chaos
  const chaosFile = `gen9monotype-${elo}.json`;
  const resultPokemon = [];
  const typeMap = {};
  
  for (const t of TYPE_NAMES) {
    const chaosFile = `gen9monotype-mono${t}-${elo}.json`;
    const chaosPath = path.join(DATA_DIR, 'chaos', chaosFile);
    if (!fs.existsSync(chaosPath)) continue;
    
    const chaosData = JSON.parse(fs.readFileSync(chaosPath, 'utf-8'));
    const totalBattles = chaosData.info["number of battles"];
    const minRawCount = 10;
    
    Object.entries(chaosData.data).forEach(([name, stats]) => {
      if (stats["Raw count"] < minRawCount) return;
      
      // If we already added this pokemon from another type's json, we can merge or just skip.
      // Usually the raw count is specific to this type team, but we'll sum it up.
      let existing = resultPokemon.find(p => p.name === name);
      
      let types = [];
      const species = Dex.species.get(name);
      if (species?.exists) {
        types = species.types;
      } else {
        const baseName = name.split('-')[0];
        const baseSpecies = Dex.species.get(baseName);
        if (baseSpecies?.exists) types = baseSpecies.types;
      }
      
      if (types.length === 0) types = ['Unknown'];
      
      const weight = stats["Raw count"] / types.length;
      for (const ty of types) {
        if (ty !== 'Unknown') typeMap[ty] = (typeMap[ty] || 0) + weight;
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
      
      if (existing) {
        existing.rawCount += stats["Raw count"];
      } else {
        resultPokemon.push({
          name, types, usagePct, rawCount: stats["Raw count"],
          topMoves, topItems, topAbilities, topSpreads, topTeammates, counters, _rawTeammates: stats.Teammates
        });
      }
    });
  }
  
  const pokemon = resultPokemon.sort((a, b) => b.usagePct - a.usagePct);
  const typeUsage = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count: Math.round(count) }));
    
  // Teams
  const teamsMap = new Map();
  for (const pkmn of pokemon) {
    const rawTeammates = pkmn._rawTeammates || {};
    for (const type of pkmn.types) {
      if (type === 'Unknown') continue;
      const teammatesOfType = Object.entries(rawTeammates)
        .filter(([tName]) => {
          let tTypes = [];
          const species = Dex.species.get(tName);
          if (species?.exists) tTypes = species.types;
          else {
            const baseName = tName.split('-')[0];
            const baseSpecies = Dex.species.get(baseName);
            if (baseSpecies?.exists) tTypes = baseSpecies.types;
          }
          return tTypes.includes(type);
        })
        .sort((a, b) => b[1] - a[1])
        .map(([tName]) => tName);
        
      if (teammatesOfType.length >= 5) {
        const top5 = teammatesOfType.slice(0, 5);
        const teamNames = [pkmn.name, ...top5].sort();
        const id = teamNames.join('|');
        const typeScore = rawTeammates[top5[0]] || pkmn.rawCount / 2;
        if (!teamsMap.has(id)) {
          teamsMap.set(id, { id, members: teamNames, score: typeScore, primaryType: type });
        }
      }
    }
  }
  
  const groupedTeams = {};
  const allTeams = Array.from(teamsMap.values()).sort((a, b) => b.score - a.score);
  for (const team of allTeams) {
    if (!groupedTeams[team.primaryType]) groupedTeams[team.primaryType] = [];
    if (groupedTeams[team.primaryType].length < 2) groupedTeams[team.primaryType].push(team);
  }
  
  // 2. Parse Leads
  const leads = {};
  for (const t of TYPE_NAMES) {
    const leadFile = `gen9monotype-mono${t}-${elo}.txt`;
    const leadPath = path.join(DATA_DIR, 'leads', leadFile);
    if (!fs.existsSync(leadPath)) continue;
    
    const lines = fs.readFileSync(leadPath, 'utf-8').split('\n');
    const typeLeads = [];
    for (const line of lines) {
      if (line.startsWith('|') && !line.includes('Rank')) {
        const parts = line.split('|').map(s => s.trim()).filter(s => s);
        if (parts.length >= 4) {
          const name = parts[1];
          const usagePctStr = parts[2].replace('%', '');
          const rawCount = parseInt(parts[3], 10);
          typeLeads.push({
            pokemon: name,
            usagePct: parseFloat(usagePctStr),
            rawCount: isNaN(rawCount) ? 0 : rawCount
          });
        }
      }
    }
    // ensure title case type match Dex.species.types format
    const properType = t.charAt(0).toUpperCase() + t.slice(1);
    leads[properType] = typeLeads.slice(0, 10); // top 10
  }
  
  // 3. Parse Matchups
  const matchups = {};
  const mChartPath = path.join(DATA_DIR, 'matchupcharts', `gen9monotype-matchup_chart-${elo}.txt`);
  if (fs.existsSync(mChartPath)) {
    const lines = fs.readFileSync(mChartPath, 'utf-8').split('\n');
    let headerParsed = false;
    let colTypes = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!headerParsed && line.startsWith('|        |')) { // Header line
            const cols = line.split('|').map(s => s.trim()).filter(s => s);
            colTypes = cols.map(c => c.charAt(0).toUpperCase() + c.slice(1));
            headerParsed = true;
            continue;
        }
        
        if (headerParsed && line.startsWith('|') && !line.startsWith('+') && !line.startsWith('|        |')) {
           const parts = line.split('|').map(s => s.trim());
           const rowTypeRaw = parts[1];
           if (!rowTypeRaw) continue;
           const rowType = rowTypeRaw.charAt(0).toUpperCase() + rowTypeRaw.slice(1);
           
           // Next line has the percentages
           const pctLine = lines[i+1];
           if (!pctLine || !pctLine.startsWith('|        |')) continue;
           
           const pctParts = pctLine.split('|').map(s => s.trim()).filter(s => s);
           
           matchups[rowType] = [];
           for (let j = 0; j < pctParts.length; j++) {
               const val = parseFloat(pctParts[j].replace('%',''));
               if (!isNaN(val) && colTypes[j]) {
                   matchups[rowType].push({
                       opponentType: colTypes[j],
                       winPct: val
                   });
               }
           }
        }
    }
  } else {
    console.warn(`Matchup file missing: ${mChartPath}`);
  }
  
  const finalObj = { pokemon, teams: groupedTeams, typeUsage, leads, matchups };
  fs.writeFileSync(path.join(OUT_DIR, `meta-${elo}.json`), JSON.stringify(finalObj, null, 2));
  console.log(`Saved meta-${elo}.json successfully!`);
}

ELOS.forEach(compileForElo);
