export interface UserPokemon {
  name: string;
  item: string;
  ability: string;
  evs: string; // Nature:HP/Atk/Def/SpA/SpD/Spe
  moves: string[];
}

export function parseShowdownTeam(text: string): UserPokemon[] {
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);
  const team: UserPokemon[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim());
    if (lines.length < 2) continue; // Skip bad blocks
    
    // 1. Name and Item
    // Handle nicknames: "Nick (Pokemon) @ Item" or "Pokemon @ Item" or just "Pokemon"
    let nameLine = lines[0];
    let name = nameLine;
    let item = '';
    
    if (nameLine.includes('@')) {
      const parts = nameLine.split('@');
      name = parts[0].trim();
      item = parts[1].trim();
    }
    
    // Extract actual species if nicknamed "Nickname (Species)"
    const nickMatch = name.match(/.*\((.*?)\)/);
    if (nickMatch) {
      name = nickMatch[1].trim();
    }
    
    // Remove gender (M) or (F)
    name = name.replace(/\s*\([MF]\)\s*/g, '').trim();

    let ability = 'Unknown';
    let nature = 'Hardy';
    const evDict: Record<string, number> = { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 };
    const moves: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('Ability:')) {
        ability = line.substring(8).trim();
      } else if (line.startsWith('EVs:')) {
        const evParts = line.substring(4).split('/');
        for (const part of evParts) {
          const [val, stat] = part.trim().split(' ');
          if (val && stat) {
            let cleanStat = stat;
            if (cleanStat === 'Spc') cleanStat = 'SpA';
            if (evDict[cleanStat] !== undefined) {
              evDict[cleanStat] = parseInt(val) || 0;
            }
          }
        }
      } else if (line.endsWith('Nature')) {
        nature = line.replace('Nature', '').trim();
      } else if (line.startsWith('- ')) {
        moves.push(line.substring(2).trim());
      }
    }

    const evsString = `${nature}:${evDict.HP}/${evDict.Atk}/${evDict.Def}/${evDict.SpA}/${evDict.SpD}/${evDict.Spe}`;
    
    team.push({ name, item, ability, evs: evsString, moves });
  }

  return team;
}
