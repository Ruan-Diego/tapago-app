/** Tokens do `design/canvas/Marca.dc.html` e `design/README.md`. */
export const colors = {
  /** Tinta: texto principal, botões primários, barra de abas. */
  ink: '#111111',
  /** Papel: fundo. */
  paper: '#F4F4F1',
  /** Branco: cartões. */
  white: '#FFFFFF',
  /** Grafite: texto secundário. */
  graphite: '#6B6B66',
  /** Texto de apoio, mais forte que o grafite. */
  slate: '#3A3A36',
  /** Borda de cartão. */
  border: '#E3E3DE',
  /** Borda de campo de texto. */
  borderStrong: '#C9C9C2',
  /** Trilho de abas e barras de progresso. */
  track: '#E9E9E4',
  /** Texto apagado sobre fundo escuro. */
  onInkMuted: '#BDBDB6',
  /** Lazer: barras de lazer nos gráficos. */
  leisure: '#B5B5AE',
  /** Ruim: listrado escuro/claro das atividades negativas nos gráficos. */
  badDark: '#3A3A36',
  badLight: '#D9D9D3',
  /** Destaque: dinheiro, aba ativa, recibo "Tá pago.". */
  accent: '#D4FF3A',
  /** Mensagens de erro (contraste de 6,5:1 sobre branco). */
  danger: '#B3261E',
} as const;

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
