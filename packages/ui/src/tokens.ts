/** Tokens do `design/canvas/Marca.dc.html` e `design/README.md`. */
import { darkColors, lightColors, type Palette } from './palettes';
import { colorScheme } from './scheme';

export { colorScheme, saveThemePreference, themePreference } from './scheme';

/** A paleta do tema escolhido na abertura do app (claro ou escuro). */
export const colors: Palette = colorScheme === 'dark' ? darkColors : lightColors;

/** Nomes registrados pelo `expo-font` no app: uma família por peso. */
export const fonts = {
  display: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoSemiBold: 'JetBrainsMono_600SemiBold',
} as const;

export const fontSizes = {
  caption: 12,
  small: 13,
  label: 14,
  body: 16,
  title: 20,
  heading: 28,
  display: 68,
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const radii = { sm: 10, md: 12, lg: 16, xl: 18, xxl: 24, pill: 999 } as const;

/** Alvo mínimo de toque. */
export const MIN_TOUCH = 44;

/** A partir desta largura a web usa o menu lateral. */
export const SIDEBAR_BREAKPOINT = 900;
