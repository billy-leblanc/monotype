import { Dex } from '@pkmn/dex';
import type { ParsedPokemon } from '../types/smogon';

function parseSpread(spread: string) {
  // Chaos format: "Nature:HP/Atk/Def/SpA/SpD/Spe"
  const parts = spread.split(':');
  if (parts.length !== 2) return { nature: 'Hardy', evs: '' };
  
  const nature = parts[0];
  const evsString = parts[1];
  
  const stats = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
  const evValues = evsString.split('/').map(Number);
  
  const formattedEVs = evValues
    .map((val, index) => val > 0 ? `${val} ${stats[index]}` : null)
    .filter(Boolean)
    .join(' / ');
    
  return { nature, evs: formattedEVs };
}

function evValuesAreSpecial(spread: string) {
    const parts = spread.split(':');
    if (parts.length !== 2) return false;
    const evValues = parts[1].split('/').map(Number);
    // if Atk is 0 and SpA is invested, probably wants 0 Atk IVs
    return evValues[1] === 0 && evValues[3] > 0;
}

export function generateShowdownText(teamMembers: string[], allPokemon: ParsedPokemon[]): string {
  let exportText = '';

  for (const member of teamMembers) {
    const data = allPokemon.find(p => p.name === member);
    if (!data) continue;

    const rawItem = data.topItems[0]?.name;
    const itemName = rawItem ? (Dex.items.get(rawItem)?.name || rawItem) : null;
    const itemStr = itemName && itemName !== 'Nothing' ? ` @ ${itemName}` : '';
      
    const rawAbility = data.topAbilities[0]?.name;
    const ability = rawAbility ? (Dex.abilities.get(rawAbility)?.name || rawAbility) : 'Unknown';
    
    const rawSpread = data.topSpreads[0]?.name || 'Hardy:0/0/0/0/0/0';
    const { nature, evs } = parseSpread(rawSpread);
    
    const moves = data.topMoves.slice(0, 4).map(m => {
      const properName = Dex.moves.get(m.name)?.name || m.name;
      return `- ${properName}`;
    }).join('\n');
    
    // Default Tera to their primary typing
    const teraType = data.types[0] || 'Normal';
    
    // Ensure the Pokemon Name is properly formatted (e.g. Flutter Mane instead of fluttermane)
    const speciesName = Dex.species.get(member)?.name || member;

    exportText += `${speciesName}${itemStr}\n`;
    exportText += `Ability: ${ability}\n`;
    exportText += `Tera Type: ${teraType}\n`;
    if (evs) exportText += `EVs: ${evs}\n`;
    exportText += `${nature} Nature\n`;
    
    // Add IV parsing if relevant (0 Atk for special attackers)
    if (evValuesAreSpecial(rawSpread)) {
      exportText += `IVs: 0 Atk\n`;
    }
    
    exportText += `${moves}\n\n`;
  }

  return exportText.trim();
}
