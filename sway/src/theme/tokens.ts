/**
 * SWAY Design System Tokens
 * Extracted from 02-design/sway_high_energy_kinetic
 * Material Design 3 inspired color system with kinetic energy
 */

export const colors = {
  light: {
    // Surface colors
    surface: '#f9f9f9',
    surfaceDim: '#dadada',
    surfaceBright: '#f9f9f9',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f3f3f3',
    surfaceContainer: '#eeeeee',
    surfaceContainerHigh: '#e8e8e8',
    surfaceContainerHighest: '#e2e2e2',
    onSurface: '#1a1c1c',
    onSurfaceVariant: '#514255',
    inverseSurface: '#2f3131',
    inverseOnSurface: '#f1f1f1',
    outline: '#837186',
    outlineVariant: '#d4c0d7',
    surfaceTint: '#9900cf',
    background: '#f9f9f9',
    onBackground: '#1a1c1c',
    surfaceVariant: '#e2e2e2',

    // Primary (Purple/Magenta - main brand color, matches 02-design/DESIGN.md)
    primary: '#9700cd',
    onPrimary: '#ffffff',
    primaryContainer: '#bd00ff',
    onPrimaryContainer: '#ffffff',
    inversePrimary: '#ebb2ff',
    primaryFixed: '#f8d8ff',
    primaryFixedDim: '#ebb2ff',
    onPrimaryFixed: '#320047',
    onPrimaryFixedVariant: '#74009f',

    // Secondary (Neon lime - accent/energy)
    secondary: '#506600',
    onSecondary: '#ffffff',
    secondaryContainer: '#c1f100',
    onSecondaryContainer: '#566c08',
    secondaryFixed: '#c3f400',
    secondaryFixedDim: '#abd600',
    onSecondaryFixed: '#161f00',
    onSecondaryFixedVariant: '#3c4d00',

    // Tertiary (Neutral grays)
    tertiary: '#454646',
    onTertiary: '#ffffff',
    tertiaryContainer: '#5d5d5d',
    onTertiaryContainer: '#d8d6d6',
    tertiaryFixed: '#e4e2e2',
    tertiaryFixedDim: '#c7c6c6',
    onTertiaryFixed: '#1b1b1b',
    onTertiaryFixedVariant: '#464747',

    // Error colors
    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',
  },
  dark: {
    // Dark mode surface colors (inverted)
    surface: '#1a1c1c',
    surfaceDim: '#0f1010',
    surfaceBright: '#2f3131',
    surfaceContainerLowest: '#0a0a0a',
    surfaceContainerLow: '#1a1c1c',
    surfaceContainer: '#1e2020',
    surfaceContainerHigh: '#282a2a',
    surfaceContainerHighest: '#333535',
    onSurface: '#f1f1f1',
    onSurfaceVariant: '#d4c0d7',
    inverseSurface: '#f1f1f1',
    inverseOnSurface: '#2f3131',
    outline: '#9d8e9f',
    outlineVariant: '#514255',
    surfaceTint: '#ebb2ff',
    background: '#1a1c1c',
    onBackground: '#f1f1f1',
    surfaceVariant: '#514255',

    // Primary (adjusted for dark)
    primary: '#ebb2ff',
    onPrimary: '#4e006a',
    primaryContainer: '#74009f',
    onPrimaryContainer: '#f8d8ff',
    inversePrimary: '#9700cd',
    primaryFixed: '#f8d8ff',
    primaryFixedDim: '#ebb2ff',
    onPrimaryFixed: '#320047',
    onPrimaryFixedVariant: '#74009f',

    // Secondary (adjusted for dark)
    secondary: '#abd600',
    onSecondary: '#2a3400',
    secondaryContainer: '#3c4d00',
    onSecondaryContainer: '#c3f400',
    secondaryFixed: '#c3f400',
    secondaryFixedDim: '#abd600',
    onSecondaryFixed: '#161f00',
    onSecondaryFixedVariant: '#3c4d00',

    // Tertiary (adjusted for dark)
    tertiary: '#c6c6c6',
    onTertiary: '#303131',
    tertiaryContainer: '#474747',
    onTertiaryContainer: '#e2e2e2',
    tertiaryFixed: '#e4e2e2',
    tertiaryFixedDim: '#c7c6c6',
    onTertiaryFixed: '#1b1b1b',
    onTertiaryFixedVariant: '#464747',

    // Error colors (slightly adjusted)
    error: '#ffb4ab',
    onError: '#690005',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
  },
} as const;

export const spacing = {
  unit: 4,
  gutter: 24,
  marginMobile: 16,
  marginDesktop: 48,
  stackSm: 8,
  stackMd: 16,
  stackLg: 32,
  margin: 48,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const radius = {
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  headlineXl: {
    fontFamily: 'Anybody_800ExtraBold',
    fontSize: 64,
    fontWeight: '800' as const,
    lineHeight: 70.4, // 1.1
    letterSpacing: -1.28, // -0.02em
  },
  headlineLg: {
    fontFamily: 'Anybody_800ExtraBold',
    fontSize: 40,
    fontWeight: '800' as const,
    lineHeight: 48, // 1.2
    letterSpacing: -0.4, // -0.01em
  },
  headlineLgMobile: {
    fontFamily: 'Anybody_800ExtraBold',
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38.4, // 1.2
    letterSpacing: 0,
  },
  headlineMd: {
    fontFamily: 'Anybody_700Bold',
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36.4, // 1.3
    letterSpacing: -0.28, // -0.01em
  },
  headlineSm: {
    fontFamily: 'Anybody_700Bold',
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28.6, // 1.3
    letterSpacing: 0,
  },
  bodyLg: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28.8, // 1.6
    letterSpacing: 0,
  },
  bodyMd: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24, // 1.5
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: 'HankenGrotesk_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 21, // 1.5
    letterSpacing: 0,
  },
  labelLg: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22.4, // 1.4
    letterSpacing: 0.64, // 0.04em
  },
  labelMd: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 19.6, // 1.4
    letterSpacing: 0.7, // 0.05em
  },
  labelSm: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16.8, // 1.4
    letterSpacing: 0.72, // 0.06em
  },
} as const;

// Animation/transition timing
export const transitions = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

// Z-index layers
export const zIndex = {
  base: 0,
  overlay: 10,
  modal: 20,
  dropdown: 30,
  toast: 40,
  tooltip: 50,
} as const;

// Shadows (iOS/Android compatible)
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Gradient for "vibe" buttons
export const gradients = {
  vibe: ['#9700cd', '#c1f100'],
  vibeAngle: 135, // degrees
} as const;

export type ColorScheme = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type RadiusKey = keyof typeof radius;
