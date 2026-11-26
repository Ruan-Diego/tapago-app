/** Tokens de movimento: as mesmas molas no app inteiro (ANIM-04). */
export const springs = {
  /** Toque: afunda e volta depressa. */
  press: { mass: 0.6, damping: 18, stiffness: 420 },
  /** Borda da frente da gota: chega primeiro. */
  lead: { mass: 0.7, damping: 20, stiffness: 340 },
  /** Borda de trás: atrasa (a gota estica) e assenta com uma leve passada. */
  trail: { mass: 1, damping: 19, stiffness: 190 },
  /** Avisos e itens que entram. */
  enter: { mass: 0.9, damping: 20, stiffness: 220 },
  /** Folhas: sem passar do ponto, para não abrir um vão embaixo delas. */
  sheet: { mass: 0.9, damping: 24, stiffness: 220, overshootClamping: true },
} as const;

export const durations = {
  /** Troca simples, usada com "reduzir movimento". */
  fade: 160,
  /** Saída de folhas, avisos e itens. */
  exit: 200,
  /** Contagem do saldo. */
  count: 450,
} as const;

/** Quanto botões e cartões encolhem ao toque. */
export const PRESSED_SCALE = 0.96;

/** Quanto arrastar uma folha para baixo para fechá-la: em pontos, ou pela velocidade. */
export const SHEET_DISMISS = { distance: 110, velocity: 800 } as const;
