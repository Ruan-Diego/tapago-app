import { addDays, dayKey, dayRange, weekStart } from './days';
import {
  DAILY_FIELDS,
  dailyDelta,
  emptyDaily,
  type Daily,
  type DailyTotals,
  type Entry,
} from './ledger';

/** Reconstrói os agregados diários a partir do livro-caixa. */
export function dailiesFromEntries(entries: readonly Entry[], timeZone: string): Daily[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const days = new Map<string, Daily>();

  for (const entry of entries) {
    const reversed = entry.reverses ? byId.get(entry.reverses) : undefined;
    // O estorno corrige o dia do lançamento desfeito, mesmo que seja feito depois da meia-noite.
    const date = dayKey((reversed ?? entry).at, timeZone);
    const daily = days.get(date) ?? emptyDaily(date);
    const delta = dailyDelta(entry, reversed);
    for (const field of DAILY_FIELDS) daily[field] += delta[field] ?? 0;

    const source = reversed ?? entry;
    if (source.type === 'earn' || source.type === 'loss') {
      const step = entry.type === 'reversal' ? -1 : 1;
      daily.counts[source.refId] = (daily.counts[source.refId] ?? 0) + step;
    }
    if (source.type === 'bonus' && source.source === 'habit') {
      const step = entry.type === 'reversal' ? -1 : 1;
      daily.bonuses[source.refId] = (daily.bonuses[source.refId] ?? 0) + step;
    }
    days.set(date, daily);
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function sumDailies(dailies: readonly Daily[], from: string, to: string): DailyTotals {
  const totals = Object.fromEntries(DAILY_FIELDS.map((field) => [field, 0])) as DailyTotals;
  for (const daily of dailies) {
    if (daily.date < from || daily.date > to) continue;
    for (const field of DAILY_FIELDS) totals[field] += daily[field];
  }
  return totals;
}

/** Variação em % contra o período anterior; `null` quando não há base de comparação. */
export function variation(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

/** Totais dos últimos `days` dias (até hoje) e do período imediatamente anterior (HIST-02). */
export function periodComparison(dailies: readonly Daily[], today: string, days: number) {
  const from = addDays(today, 1 - days);
  return {
    current: sumDailies(dailies, from, today),
    previous: sumDailies(dailies, addDays(from, -days), addDays(from, -1)),
  };
}

/** Meta semanal: soma dos ganhos positivos de segunda a domingo (R11). */
export function weeklyProgress(dailies: readonly Daily[], today: string, goal: number) {
  const monday = weekStart(today);
  const { earned } = sumDailies(dailies, monday, addDays(monday, 6));
  return {
    earned,
    goal,
    /** 0 a 100. Sem meta definida, 0. */
    percent: goal > 0 ? Math.min(100, Math.floor((earned / goal) * 100)) : 0,
  };
}

/** Dia limpo: sem nenhuma atividade negativa registrada (R12). */
export function isCleanDay(daily: Daily | undefined): boolean {
  return (daily?.negCount ?? 0) <= 0;
}

export function countCleanDays(dailies: readonly Daily[], from: string, to: string): number {
  const byDate = new Map(dailies.map((daily) => [daily.date, daily]));
  return dayRange(from, to).filter((day) => isCleanDay(byDate.get(day))).length;
}

function positiveDays(dailies: readonly Daily[]): Set<string> {
  return new Set(dailies.filter((daily) => daily.posCount > 0).map((daily) => daily.date));
}

/**
 * Sequência: dias seguidos com ao menos 1 atividade positiva (R12). Hoje ainda sem registro não
 * quebra a sequência que vinha até ontem.
 */
export function currentStreak(dailies: readonly Daily[], today: string): number {
  const days = positiveDays(dailies);
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

/** Maior sequência dentro dos agregados recebidos. */
export function bestStreak(dailies: readonly Daily[]): number {
  const days = positiveDays(dailies);
  let best = 0;
  for (const start of days) {
    if (days.has(addDays(start, -1))) continue;
    let length = 1;
    while (days.has(addDays(start, length))) length += 1;
    best = Math.max(best, length);
  }
  return best;
}
