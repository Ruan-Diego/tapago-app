/** "2026-11-25" → "25/11". */
export function shortDate(day: string): string {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

export const plural = (amount: number, one: string, many: string) =>
  `${amount} ${amount === 1 ? one : many}`;
