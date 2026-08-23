const SUMMON_HUES: Readonly<Record<string, number>> = {
  goku: 38,
  naruto: 24,
  luffy: 354,
  eren: 268,
  l: 186,
  lelouch: 318,
};

function fallbackHue(value: string): number {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 360;
}

export function getSummonPresentation(definitionId: string) {
  const hue = SUMMON_HUES[definitionId] ?? fallbackHue(definitionId);
  return {
    accent: `hsl(${hue} 88% 57%)`,
    accentMuted: `hsl(${hue} 58% 31%)`,
    portraitBackground: `linear-gradient(145deg, hsl(${hue} 72% 24%), hsl(${hue} 80% 10%))`,
  };
}
