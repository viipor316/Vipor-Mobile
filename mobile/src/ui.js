// VIPOR Service — shared design tokens.
// One source of truth for color, type, spacing, radius and elevation so every
// screen looks like the same product.

const shadow = {
  shadowColor: '#0b1220', shadowOpacity: 0.08, shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 }, elevation: 3,
};
const shadowSm = {
  shadowColor: '#0b1220', shadowOpacity: 0.05, shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 }, elevation: 1,
};

export const ui = {
  // palette
  navy: '#161d2b',
  ink: '#11182a',
  body: '#3f4858',
  muted: '#8b94a4',
  bg: '#f4f6fa',
  surface: '#ffffff',
  line: '#e7ebf2',
  field: '#f6f8fb',
  red: '#c8102e',
  green: '#157a48',
  amber: '#b26a00',
  blue: '#2563eb',

  // radius / spacing
  r: 14,
  rLg: 20,
  shadow,
  shadowSm,

  // type scale
  h1: { fontSize: 28, fontWeight: '800', color: '#11182a', letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '800', color: '#11182a', letterSpacing: -0.2 },
  title: { fontSize: 16, fontWeight: '700', color: '#11182a' },
  bodyText: { fontSize: 14, color: '#3f4858', lineHeight: 21 },
  label: { fontSize: 12.5, fontWeight: '700', color: '#8b94a4', letterSpacing: 0.3, textTransform: 'uppercase' },
  caption: { fontSize: 12, color: '#8b94a4' },

  // building blocks
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, ...shadowSm },
  input: {
    backgroundColor: '#f6f8fb', borderRadius: 12, borderWidth: 1, borderColor: '#e7ebf2',
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#11182a',
  },
  // curved brand header used across screens
  header: {
    paddingHorizontal: 20, paddingBottom: 20,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
};
