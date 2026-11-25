/** Faixas aceitas pelos formulários e pelas regras do Firestore. */
export const LIMITS = {
  nameMax: 60,
  descriptionMax: 140,
  /** Centavos (R1). */
  valueMin: 1,
  valueMax: 1_000_000,
  minutesMin: 1,
  minutesMax: 1440,
} as const;
