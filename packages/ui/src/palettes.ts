/**
 * As duas paletas do app, com os mesmos nomes. O tema é escolhido uma vez, na abertura
 * (`scheme.ts`); `tokens.ts` exporta a paleta ativa como `colors`.
 *
 * Os nomes vêm do tema claro do protótipo (`design/canvas/Marca.dc.html`). No escuro, cada nome
 * mantém o papel: `ink` é o texto principal (claro), `paper` o fundo e `white` os cartões
 * (escuros). As superfícies de destaque (saldo, timer, botão primário) usam `surfaceInk`, com o
 * texto `onSurfaceInk`; o texto sobre o destaque verde usa `onAccent`.
 */
export interface Palette {
  /** Texto principal; bordas e ícones fortes. */
  ink: string;
  /** Fundo. */
  paper: string;
  /** Cartões. */
  white: string;
  /** Texto secundário. */
  graphite: string;
  /** Texto de apoio, mais forte que o grafite. */
  slate: string;
  /** Borda de cartão. */
  border: string;
  /** Borda de campo de texto. */
  borderStrong: string;
  /** Trilho de abas e barras de progresso. */
  track: string;
  /** Superfície de destaque: saldo, timer, botão primário, barra lateral. */
  surfaceInk: string;
  /** Texto sobre `surfaceInk`. */
  onSurfaceInk: string;
  /** Texto apagado sobre `surfaceInk`. */
  onInkMuted: string;
  /** Trilho do anel do timer, sobre `surfaceInk`. */
  inkTrack: string;
  /** Lazer: barras de lazer nos gráficos. */
  leisure: string;
  /** Ruim: listrado das atividades negativas nos gráficos. */
  badDark: string;
  badLight: string;
  /** Mapa de constância: de nenhum a quatro ou mais registros no dia. */
  heat: readonly [string, string, string, string, string];
  /** Destaque: dinheiro, aba ativa, recibo "Tá pago.". Igual nos dois temas. */
  accent: string;
  /** Texto sobre o destaque. */
  onAccent: string;
  /** Mensagens de erro. */
  danger: string;
  /** Fundo de item sob o mouse (menu lateral). */
  hover: string;
  /** Interruptor ligado. */
  toggleOn: string;
}

export const lightColors: Palette = {
  ink: '#111111',
  paper: '#F4F4F1',
  white: '#FFFFFF',
  graphite: '#6B6B66',
  slate: '#3A3A36',
  border: '#E3E3DE',
  borderStrong: '#C9C9C2',
  track: '#E9E9E4',
  surfaceInk: '#111111',
  onSurfaceInk: '#FFFFFF',
  onInkMuted: '#BDBDB6',
  inkTrack: '#2E2E2B',
  leisure: '#B5B5AE',
  badDark: '#3A3A36',
  badLight: '#D9D9D3',
  heat: ['#E6E6E1', '#C9C9C2', '#9C9C95', '#5E5E59', '#111111'],
  accent: '#D4FF3A',
  onAccent: '#111111',
  danger: '#B3261E',
  hover: 'rgba(17,17,17,0.08)',
  toggleOn: '#111111',
};

export const darkColors: Palette = {
  ink: '#F2F2EE',
  paper: '#0E0E0D',
  white: '#1A1A18',
  graphite: '#A3A39C',
  slate: '#D2D2CB',
  border: '#2B2B28',
  borderStrong: '#46463F',
  track: '#262623',
  // Mais clara que os cartões, para o destaque continuar se destacando no escuro.
  surfaceInk: '#2C2C29',
  onSurfaceInk: '#FFFFFF',
  onInkMuted: '#B4B4AD',
  inkTrack: '#45453F',
  leisure: '#77776F',
  badDark: '#C9C9C2',
  badLight: '#3A3A36',
  heat: ['#22221F', '#3A3A36', '#6B6B66', '#A3A39C', '#F2F2EE'],
  accent: '#D4FF3A',
  onAccent: '#111111',
  danger: '#FF8A80',
  hover: 'rgba(255,255,255,0.08)',
  // No escuro, o interruptor ligado usa o destaque: a superfície escura não se distingue do fundo.
  toggleOn: '#B8E62E',
};

/** Vidro (ANIM-01, 03) de cada tema. */
export interface GlassTokens {
  /** Desfoque na web, em px, e o ganho de saturação por trás do vidro. */
  blur: number;
  saturate: number;
  /** Intensidade do `expo-blur` no Android (1 a 100). */
  intensity: number;
  /** Tom do `expo-blur`. */
  tint: 'light' | 'dark';
  /** Cor do véu (RGB) por cima do desfoque. */
  veilRgb: readonly [number, number, number];
  /**
   * Opacidade do véu. É o que garante o contraste do texto com qualquer conteúdo atrás (ver
   * `contrast.test.ts`).
   */
  opacity: number;
  /** Sem desfoque (Android antigo, navegador sem suporte), o fundo fica quase opaco. */
  fallbackOpacity: number;
  border: string;
  /** Linha externa fina, para o vidro não sumir sobre o fundo. */
  edge: string;
  shadow: string;
  /** Brilho na borda de cima. */
  highlight: string;
}

export const lightGlass: GlassTokens = {
  blur: 22,
  saturate: 1.8,
  intensity: 45,
  tint: 'light',
  veilRgb: [255, 255, 255],
  opacity: 0.74,
  fallbackOpacity: 0.94,
  border: 'rgba(255,255,255,0.65)',
  edge: 'rgba(17,17,17,0.10)',
  shadow: '0 10px 30px rgba(17,17,17,0.18)',
  highlight: 'inset 0 1px 0 rgba(255,255,255,0.8)',
};

export const darkGlass: GlassTokens = {
  blur: 22,
  saturate: 1.4,
  intensity: 45,
  tint: 'dark',
  veilRgb: [26, 26, 24],
  opacity: 0.74,
  fallbackOpacity: 0.94,
  border: 'rgba(255,255,255,0.10)',
  edge: 'rgba(255,255,255,0.12)',
  shadow: '0 10px 30px rgba(0,0,0,0.5)',
  highlight: 'inset 0 1px 0 rgba(255,255,255,0.10)',
};
