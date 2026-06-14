export const theme = {
  colors: {
    // Backgrounds
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F8F7F4',
    bgTertiary: '#F1EFE8',
    bgSidebar: '#111110',

    // Foregrounds / text
    textPrimary: '#1A1A19',
    textSecondary: '#5F5E5A',
    textTertiary: '#888780',
    textInverse: '#F8F7F4',

    // Brand accent — warm espresso
    accent: '#C4622D',
    accentLight: '#FAE8DC',
    accentDark: '#8A3D18',

    // Semantic
    success: '#1D9E75',
    successLight: '#E1F5EE',
    warning: '#BA7517',
    warningLight: '#FAEEDA',
    danger: '#C0392B',
    dangerLight: '#FCEBEB',
    info: '#185FA5',
    infoLight: '#E6F1FB',

    // Channel pill colors
    whatsapp: '#1D9E75',
    whatsappLight: '#E1F5EE',
    sms: '#185FA5',
    smsLight: '#E6F1FB',
    email: '#7F77DD',
    emailLight: '#EEEDFE',
    rcs: '#BA7517',
    rcsLight: '#FAEEDA',

    // Churn risk
    churnLow: '#1D9E75',
    churnMedium: '#BA7517',
    churnHigh: '#C0392B',

    // Borders
    borderDefault: 'rgba(26,26,25,0.12)',
    borderStrong: 'rgba(26,26,25,0.25)',
    borderAccent: '#C4622D',
  },

  typography: {
    fontSans: "'Inter', system-ui, -apple-system, sans-serif",
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
    sizeSm: '12px',
    sizeBase: '14px',
    sizeMd: '15px',
    sizeLg: '18px',
    sizeXl: '24px',
    size2xl: '32px',
    weightNormal: 400,
    weightMedium: 500,
    weightBold: 600,
    lineHeightBase: 1.6,
    lineHeightTight: 1.3,
  },

  radii: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
    full: '9999px',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
  },

  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.06)',
    md: '0 2px 8px rgba(0,0,0,0.08)',
  },

  sidebar: {
    width: '220px',
  },
} as const;

export type Theme = typeof theme;
