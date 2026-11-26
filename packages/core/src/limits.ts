/** Faixas aceitas pelos formulários e pelas regras do Firestore. */
export const LIMITS = {
  nameMax: 60,
  descriptionMax: 140,
  /** Centavos (R1). */
  valueMin: 1,
  valueMax: 1_000_000,
  minutesMin: 1,
  minutesMax: 1440,
  /** Meta semanal em centavos; 0 é "sem meta". */
  weeklyGoalMax: 10_000_000,
  /** Foto em base64: 200 mil caracteres são menos de 150 KB de JPEG (PROF-01). */
  avatarMaxChars: 200_000,
  /** Lado da foto, em pixels. */
  avatarSize: 256,
} as const;
