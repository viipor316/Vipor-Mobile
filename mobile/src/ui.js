// VIPOR Service — shared design tokens.
// One source of truth for color, spacing, radius and elevation so every screen
// looks like the same product. Import { ui } and use ui.navy, ui.card, etc.

const shadow = {
  shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 }, elevation: 2,
};

export const ui = {
  // palette
  navy: '#1b2434',
  ink: '#1a2230',
  muted: '#8a93a0',
  bg: '#eef1f5',
  line: '#e6eaf0',
  red: '#c8102e',
  green: '#1e6f43',
  amber: '#b26a00',

  // metrics
  radius: 16,
  shadow,

  // common card
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', ...shadow,
  },
};
