export const colors = {
  background: '#0B0D12',
  surface: '#1A1C23',
  surfaceHighlight: '#2A2D3A',
  primary: '#047857', // Emerald 700
  primaryDark: '#064e3b', // Emerald 900
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  border: '#374151',
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '700', color: colors.text },
  h2: { fontSize: 24, fontWeight: '600', color: colors.text },
  h3: { fontSize: 20, fontWeight: '600', color: colors.text },
  body: { fontSize: 16, fontWeight: '400', color: colors.text },
  caption: { fontSize: 14, fontWeight: '400', color: colors.textMuted },
  button: { fontSize: 16, fontWeight: '600', color: colors.text },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  }
};
