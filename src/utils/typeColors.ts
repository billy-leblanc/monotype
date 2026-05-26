// Standard Pokémon type colors, used for type badges across the UI.
export const TYPE_COLORS: Record<string, string> = {
  Normal: '#9fa19f',
  Fire: '#e62829',
  Water: '#2980ef',
  Electric: '#d9a400',
  Grass: '#3fa129',
  Ice: '#34b6c4',
  Fighting: '#ff8000',
  Poison: '#9141cb',
  Ground: '#a8761f',
  Flying: '#7fb0e8',
  Psychic: '#ef4179',
  Bug: '#8a9a1a',
  Rock: '#a8a05f',
  Ghost: '#8050a0',
  Dragon: '#5060e1',
  Dark: '#5a4a4a',
  Steel: '#5a8fa8',
  Fairy: '#ef70ef',
};

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#6b7280';
}
