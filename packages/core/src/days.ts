/**
 * Dias são chaves `AAAA-MM-DD` no fuso do usuário. Depois de convertida, a chave é tratada como
 * data de calendário (contas em UTC), imune a horário de verão.
 */
const DAY_MS = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    try {
      formatter = new Intl.DateTimeFormat('en-US', { ...options, timeZone });
    } catch {
      // Fuso desconhecido neste aparelho: usa o do próprio aparelho.
      formatter = new Intl.DateTimeFormat('en-US', options);
    }
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Dia de `date` no fuso informado. */
export function dayKey(date: Date, timeZone: string): string {
  const parts = formatterFor(timeZone).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const toUtc = (key: string) => Date.parse(`${key}T00:00:00Z`);

export function addDays(key: string, amount: number): string {
  return new Date(toUtc(key) + amount * DAY_MS).toISOString().slice(0, 10);
}

/** Dias de `from` a `to`, incluindo os dois. Vazio se `from` vier depois de `to`. */
export function dayRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Segunda-feira da semana do dia (R11: a semana vai de segunda a domingo). */
export function weekStart(key: string): string {
  const weekday = new Date(toUtc(key)).getUTCDay();
  return addDays(key, -((weekday + 6) % 7));
}
