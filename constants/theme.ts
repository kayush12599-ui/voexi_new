/**
 * VOEXI Cyberpunk-Futuristic Design System & Brand Constants
 */

const tintColorLight = '#A855F7';
const tintColorDark = '#A855F7';

export const Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    card: '#F9F9FB',
    border: '#EEEEEE',
    tint: tintColorLight,
    tabIconDefault: '#888888',
    tabIconSelected: '#FFD700',
    icon: '#687076',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    card: '#0A0A0F',
    cardAlt: '#0A0A18',
    border: '#1A1A24',
    borderAlt: '#11111A',
    tint: tintColorDark,
    tabIconDefault: '#888888',
    tabIconSelected: '#FFD700',
    icon: '#9BA1A6',
  },
};

export const Fonts = {
  default: 'System',
  bold: 'System',
  rounded: 'System',
  mono: 'SpaceMono',
};

export const VOEXITheme = {
  colors: {
    // Brand Palette
    primary: '#A855F7',       // Neon Purple / Violet
    primaryGlow: 'rgba(168, 85, 247, 0.5)',
    secondary: '#00F2FE',     // Cyber Cyan / Electric Blue
    pink: '#EC4899',          // Hot Pink / Magenta
    accent: '#EC4899',
    gold: '#FFD700',          // VIP Yellow Gold Accent

    // Dark Mode Backgrounds & Borders
    background: '#000000',    // Pitch Black
    card: '#0A0A0F',          // Card Container
    cardAlt: '#0A0A18',
    surface: '#12121A',
    border: '#1A1A24',        // Card & Divider Borders
    borderAlt: '#11111A',

    // Light Mode Backgrounds & Borders
    backgroundLight: '#FFFFFF',
    cardLight: '#F9F9FB',
    borderLight: '#EEEEEE',

    // Text & Utilities
    text: '#FFFFFF',
    textLight: '#000000',
    textDim: '#AAAAAA',
    inputBg: '#050505',
    error: '#FF4444',
    success: '#00C851',
    glass: 'rgba(255, 255, 255, 0.03)',
    glow: '#3C096C',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  roundness: {
    sm: 4,
    md: 10,
    lg: 16,
    xl: 24,
    full: 999,
  }
};

export default VOEXITheme;
