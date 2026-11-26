/** Tokens do vidro (ANIM-01, 03): desfoque, opacidade, borda, brilho e sombra. */
export const glass = {
  /** Desfoque na web, em px, e o ganho de saturação por trás do vidro. */
  blur: 22,
  saturate: 1.8,
  /** Intensidade do `expo-blur` no Android (1 a 100). */
  intensity: 45,
  /**
   * Branco por cima do desfoque. É o que garante o contraste do texto com qualquer conteúdo atrás
   * (ver `contrast.test.ts`): abaixo disto, o texto sobre fundo preto fica ilegível.
   */
  opacity: 0.74,
  /** Sem desfoque (Android antigo, navegador sem suporte), o fundo fica quase opaco. */
  fallbackOpacity: 0.94,
  border: 'rgba(255,255,255,0.65)',
  /** Linha externa fina, para o vidro não sumir sobre fundo claro. */
  edge: 'rgba(17,17,17,0.10)',
  shadow: '0 10px 30px rgba(17,17,17,0.18)',
  /** Brilho na borda de cima. */
  highlight: 'inset 0 1px 0 rgba(255,255,255,0.8)',
} as const;

/** Cor do véu branco do vidro. */
export const veil = (opacity: number) => `rgba(255,255,255,${opacity})`;
