/**
 * Valores são reais fictícios guardados como inteiros em centavos (R1).
 * A interface mostra "R$ 18"; os centavos só aparecem quando existem.
 */
export function formatMoney(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`Valor em centavos precisa ser inteiro: ${cents}`);
  }
  const digits = cents % 100 === 0 ? 0 : 2;
  const absolute = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(cents) / 100);
  // Sinal de menos tipográfico (U+2212), como no design.
  return cents < 0 ? `−${absolute}` : absolute;
}
