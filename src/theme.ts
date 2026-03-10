import { Platform } from 'react-native';

export const colors = {
  // Backgrounds
  background: '#FFF8F0',
  card: '#FFFFFF',
  cardAlt: '#FFF3E8',

  // Primary (warm orange)
  primary: '#FF6B35',
  primaryLight: '#FFE0CC',
  primaryDark: '#E55A2B',

  // Text
  textPrimary: '#2D2D2D',
  textSecondary: '#999999',
  textMuted: '#CCCCCC',

  // Accent
  accent: '#FF9F43',
  accentLight: '#FFF0E0',

  // Semantic
  success: '#4CAF50',
  successLight: '#E8F5E9',
  error: '#F44336',
  errorLight: '#FFEBEE',
  warning: '#FFC107',

  // Night theme (for NightInput screen)
  nightBg1: '#1a1a3e',
  nightBg2: '#0d0d2b',
  nightText: '#E0E0FF',
  nightCard: '#252550',

  // Ringing gradient
  ringGrad1: '#FF8A50',
  ringGrad2: '#FFCC02',

  // Misc
  border: '#F0E8E0',
  divider: '#F5F0EB',
  switchTrackOff: '#DDD',
  switchTrackOn: '#FF6B35',
  white: '#FFFFFF',
  black: '#000000',
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  } as const,
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  } as const,
  fab: {
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  } as const,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const fonts = {
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
};
