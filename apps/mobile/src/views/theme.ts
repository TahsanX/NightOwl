/** Single source of visual truth — screens never hardcode a colour. */
export const theme = {
  colors: {
    background: '#0B0C0E',
    surface: '#15171A',
    surfaceRaised: '#1E2126',
    border: '#2A2E35',
    text: '#F2F3F5',
    textMuted: '#9BA1A6',
    accent: '#F5C451',
    route: '#FFFFFF',
    routeAlternative: '#6E7681',
    scoreHigh: '#30A46C',
    scoreMid: '#F5A524',
    scoreLow: '#E5484D',
  },
  spacing: (units: number): number => units * 8,
  radius: { sm: 8, md: 14, lg: 22, pill: 999 },
} as const;

export function scoreColor(total: number): string {
  if (total >= 60) return theme.colors.scoreHigh;
  if (total >= 35) return theme.colors.scoreMid;
  return theme.colors.scoreLow;
}
