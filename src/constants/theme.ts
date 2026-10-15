export const Colors = {
  // Brand Colors (Mercado Libre Inspiration)
  primary: '#009ee3',
  primaryHover: '#0081bb',
  primaryLight: '#e6f5fc',
  primaryBorder: '#cce9f8',

  // Backgrounds & Surface
  background: '#f5f8fa',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  white: '#ffffff',

  // Typography
  textMain: '#1e293b',
  textTitle: '#0f172a',
  textSecondary: '#64748b',
  textDisabled: '#94a3b8',
  textLight: '#ffffff',

  // Borders
  border: '#e2e8f0',
  borderInput: '#cbd5e1',

  // Status Badges (Pastel Style)
  statusPendingBg: '#e6f5fc',
  statusPendingText: '#009ee3',
  statusPendingBorder: '#cce9f8',

  statusConfirmedBg: '#e6f7ed',
  statusConfirmedText: '#00a650',
  statusConfirmedBorder: '#ccefdc',

  statusCancelledBg: '#fbebee',
  statusCancelledText: '#d93838',
  statusCancelledBorder: '#f6ccd2',

  statusCompletedBg: '#f1f5f9',
  statusCompletedText: '#475569',
  statusCompletedBorder: '#e2e8f0',

  // Accent & Ratings
  star: '#ffb800',
  danger: '#d93838',
  success: '#00a650',
  info: '#009ee3',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 14,
  xl: 18,
  full: 9999,
};

export const Typography = {
  family: 'System', // Uses native robust typography, easily adapted to Plus Jakarta Sans
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};

export const Shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  hover: {
    shadowColor: '#009ee3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
};
