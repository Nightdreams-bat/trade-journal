// Chart / canvas colors — kept in sync with the CSS custom properties in
// theme.css. Recharts takes plain color strings for stroke/fill/gradient-stop
// props (SVG presentation attributes don't resolve CSS custom properties), so
// each theme needs its own literal palette here rather than one set of
// `var(--x)` references. Pick the right one with `useColors()` (src/themeMode.tsx).
export interface ColorPalette {
  green: string
  greenBright: string
  red: string
  redBright: string
  accent: string
  accentBright: string
  accentDeep: string
  accent2: string
  accent2Bright: string
  amber: string
  border: string
  borderSoft: string
  text: string
  textStrong: string
  textMuted: string
  textDim: string
  card: string
  cardHover: string
  bg: string
  bgElevated: string
  ink: string
  greenSoft: string
  redSoft: string
  accentBg: string
  accent2Bg: string
  tooltipBg: string
  tooltipShadow: string
  chartCursor: string
}

export const LIGHT_COLORS: ColorPalette = {
  green: '#12995F',
  greenBright: '#1FBE78',
  red: '#E23D45',
  redBright: '#F2545B',
  accent: '#3D6EE8',
  accentBright: '#6E93F6',
  accentDeep: '#2A4FC2',
  accent2: '#8A5CF0',
  accent2Bright: '#A97DF7',
  amber: '#F5A623',
  border: '#D8CFC0',
  borderSoft: '#E7E0D3',
  text: '#4A443B',
  textStrong: '#2E2A24',
  textMuted: '#6F665A',
  textDim: '#9A8F7E',
  card: '#FBF9F5',
  cardHover: '#FFFFFF',
  bg: '#E4DDD2',
  bgElevated: '#F5F1EA',
  ink: '#3B372F',
  greenSoft: 'rgba(31, 190, 120, 0.18)',
  redSoft: 'rgba(226, 61, 69, 0.16)',
  accentBg: 'rgba(61, 110, 232, 0.14)',
  accent2Bg: 'rgba(138, 92, 240, 0.14)',
  tooltipBg: 'rgba(252, 250, 246, 0.94)',
  tooltipShadow: '0 12px 32px -12px rgba(60,50,38,0.22)',
  chartCursor: 'rgba(60, 50, 38, 0.06)',
}

// Same shape, recolored for a genuinely black dark theme — near-black
// surfaces (#070807 / #0D0F0D), off-white text, an emerald green accent.
// Red/amber are close to unchanged; nothing here is mid-grey on purpose.
export const DARK_COLORS: ColorPalette = {
  green: '#15803D',
  greenBright: '#34D399',
  red: '#E23D45',
  redBright: '#F2545B',
  accent: '#34D399',
  accentBright: '#5EEBB0',
  accentDeep: '#15803D',
  accent2: '#8A5CF0',
  accent2Bright: '#A97DF7',
  amber: '#E8A33D',
  border: 'rgba(255, 255, 255, 0.07)',
  borderSoft: 'rgba(255, 255, 255, 0.04)',
  text: 'rgba(248, 248, 248, 0.82)',
  textStrong: '#F8F8F8',
  textMuted: 'rgba(248, 248, 248, 0.55)',
  textDim: 'rgba(248, 248, 248, 0.36)',
  card: '#0D0F0D',
  cardHover: '#141714',
  bg: '#070807',
  bgElevated: '#0B0D0B',
  ink: '#F8F8F8',
  greenSoft: 'rgba(52, 211, 153, 0.18)',
  redSoft: 'rgba(226, 61, 69, 0.20)',
  accentBg: 'rgba(52, 211, 153, 0.14)',
  accent2Bg: 'rgba(138, 92, 240, 0.16)',
  tooltipBg: 'rgba(9, 10, 9, 0.96)',
  tooltipShadow: '0 12px 32px -12px rgba(0,0,0,0.6)',
  chartCursor: 'rgba(255, 255, 255, 0.05)',
}
