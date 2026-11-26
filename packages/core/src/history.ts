/** Cálculos dos blocos do Histórico completo (HIST-01, HIST-03 a HIST-07). */
import { addDays, dayKey, dayRange, weekStart } from './days';
import type { Daily, DailyTotals, Entry } from './ledger';
import { sumDailies } from './stats';

/** Filtro de período, em dias (HIST-01). */
export const HISTORY_PERIODS = [7, 30, 90] as const;
export type HistoryPeriod = (typeof HISTORY_PERIODS)[number];
export const DEFAULT_PERIOD: HistoryPeriod = 30;

export const WEEKS_IN_BARS = 8;
export const WEEKS_IN_HEATMAP = 13;

/**
 * Dias de agregados lidos em tempo real: o maior período mais o anterior, para a variação. Cobre
 * também as 8 semanas das barras e as 13 do mapa.
 */
export const HISTORY_WINDOW_DAYS = 2 * 90;

/** Junta duas leituras dos agregados; no mesmo dia, vale a segunda (a mais nova). */
export function mergeDailies(older: readonly Daily[], newer: readonly Daily[]): Daily[] {
  const byDate = new Map(older.map((daily) => [daily.date, daily]));
  for (const daily of newer) byDate.set(daily.date, daily);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface TimeShares {
  good: number;
  leisure: number;
  bad: number;
}

/** Porcentagens inteiras que somam 100 (HIST-03). Sem tempo nenhum, tudo zero. */
export function timeShares({
  posMin,
  leisureMin,
  negMin,
}: Pick<DailyTotals, 'posMin' | 'leisureMin' | 'negMin'>): TimeShares {
  const parts = [posMin, leisureMin, negMin].map((part) => Math.max(0, part));
  const total = parts.reduce((sum, part) => sum + part, 0);
  if (total === 0) return { good: 0, leisure: 0, bad: 0 };
  const exact = parts.map((part) => (part * 100) / total);
  const rounded = exact.map(Math.floor);
  // As sobras vão para quem perdeu mais no arredondamento para baixo.
  const order = exact
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest);
  const missing = 100 - rounded.reduce((sum, part) => sum + part, 0);
  for (const { index } of order.slice(0, missing)) rounded[index] = (rounded[index] ?? 0) + 1;
  const [good = 0, leisure = 0, bad = 0] = rounded;
  return { good, leisure, bad };
}

/** Minutos de atividades boas para cada 1 h de lazer; `null` sem lazer no período. */
export function goodMinutesPerLeisureHour(posMin: number, leisureMin: number): number | null {
  return leisureMin > 0 ? Math.round((posMin / leisureMin) * 60) : null;
}

const netOf = (daily: Daily) => daily.earned - daily.lost - daily.spent;

export interface BalanceSeries {
  /** Saldo antes do primeiro dia. */
  start: number;
  /** Saldo no fim de cada dia, de `from` até hoje. */
  points: { date: string; balance: number }[];
}

/**
 * Saldo dia a dia (HIST-04), reconstruído de trás para frente: parte do saldo atual e desfaz o
 * movimento de cada dia. Assim não precisa de nada anterior ao período.
 */
export function balanceSeries(
  dailies: readonly Daily[],
  balance: number,
  from: string,
  today: string,
): BalanceSeries {
  const byDate = new Map(dailies.map((daily) => [daily.date, daily]));
  // O relógio de outro aparelho pode ter lançado em um dia que aqui ainda é amanhã.
  let running = dailies
    .filter((daily) => daily.date > today)
    .reduce((value, daily) => value - netOf(daily), balance);
  const points = dayRange(from, today)
    .reverse()
    .map((date) => {
      const point = { date, balance: running };
      const daily = byDate.get(date);
      if (daily) running -= netOf(daily);
      return point;
    })
    .reverse();
  return { start: running, points };
}

export interface WeekHours {
  /** Segunda-feira da semana. */
  from: string;
  posMin: number;
  leisureMin: number;
  negMin: number;
}

/** As últimas semanas, da mais antiga à atual, com os três tempos (HIST-05). */
export function weeklyMinutes(
  dailies: readonly Daily[],
  today: string,
  weeks: number = WEEKS_IN_BARS,
): WeekHours[] {
  const current = weekStart(today);
  return Array.from({ length: weeks }, (_, index) => {
    const from = addDays(current, -7 * (weeks - 1 - index));
    const { posMin, leisureMin, negMin } = sumDailies(dailies, from, addDays(from, 6));
    return { from, posMin, leisureMin, negMin };
  });
}

export interface HeatCell {
  date: string;
  /** Atividades boas registradas no dia. */
  count: number;
  /** 0 a 4, para a intensidade da cor. */
  level: number;
  future: boolean;
}

/** Mapa de constância (HIST-06): uma coluna por semana, de segunda a domingo. */
export function heatmap(
  dailies: readonly Daily[],
  today: string,
  weeks: number = WEEKS_IN_HEATMAP,
): HeatCell[][] {
  const counts = new Map(dailies.map((daily) => [daily.date, Math.max(0, daily.posCount)]));
  const current = weekStart(today);
  return Array.from({ length: weeks }, (_, column) => {
    const monday = addDays(current, -7 * (weeks - 1 - column));
    return Array.from({ length: 7 }, (_, row) => {
      const date = addDays(monday, row);
      const count = counts.get(date) ?? 0;
      return { date, count, level: Math.min(count, 4), future: date > today };
    });
  });
}

/** Primeiro dia com algum movimento, ou `null`. */
export function firstActiveDay(dailies: readonly Daily[]): string | null {
  return dailies.reduce<string | null>(
    (first, daily) => (first === null || daily.date < first ? daily.date : first),
    null,
  );
}

export interface RankingRow {
  refId: string;
  /** O nome do lançamento mais recente. */
  name: string;
  minutes: number;
  value: number;
  count: number;
}

export interface Rankings {
  /** Tempo por atividade boa. */
  activities: RankingRow[];
  /** Tempo por lazer. */
  leisure: RankingRow[];
  /** Onde se perdeu dinheiro. */
  losses: RankingRow[];
}

export interface RankingFilter {
  from: string;
  today: string;
  timeZone: string;
  /** Uso com o timer ainda aberto: o tempo dele só conta ao encerrar. */
  openUseEntryId?: string;
}

/** Rankings do período (HIST-07). Lançamentos estornados não contam. */
export function rankings(
  entries: readonly Entry[],
  { from, today, timeZone, openUseEntryId }: RankingFilter,
): Rankings {
  const reversed = new Set(entries.flatMap((entry) => (entry.reverses ? [entry.reverses] : [])));
  const groups = {
    earn: new Map<string, RankingRow & { at: number }>(),
    use: new Map<string, RankingRow & { at: number }>(),
    loss: new Map<string, RankingRow & { at: number }>(),
  };

  for (const entry of entries) {
    if (entry.type !== 'earn' && entry.type !== 'use' && entry.type !== 'loss') continue;
    if (reversed.has(entry.id) || entry.id === openUseEntryId) continue;
    const day = dayKey(entry.at, timeZone);
    if (day < from || day > today) continue;

    const group = groups[entry.type];
    const row = group.get(entry.refId) ?? {
      refId: entry.refId,
      name: entry.name,
      minutes: 0,
      value: 0,
      count: 0,
      at: 0,
    };
    row.minutes += entry.minutes;
    row.value += entry.value;
    row.count += 1;
    if (entry.at.getTime() >= row.at) {
      row.at = entry.at.getTime();
      row.name = entry.name;
    }
    group.set(entry.refId, row);
  }

  const sorted = (group: Map<string, RankingRow & { at: number }>, by: 'minutes' | 'value') =>
    [...group.values()]
      .sort((a, b) => b[by] - a[by] || a.name.localeCompare(b.name, 'pt-BR'))
      .map(({ at: _at, ...row }) => row);

  return {
    activities: sorted(groups.earn, 'minutes'),
    leisure: sorted(groups.use, 'minutes'),
    losses: sorted(groups.loss, 'value'),
  };
}

export interface ChartPoint {
  x: number;
  y: number;
}

/**
 * Posições da linha em uma área `width` × `height`. Uma série sem variação fica no meio.
 */
export function linePoints(
  values: readonly number[],
  width: number,
  height: number,
  padding = 4,
): ChartPoint[] {
  const min = Math.min(...values);
  const range = Math.max(...values) - min;
  const usable = height - 2 * padding;
  return values.map((value, index) => ({
    x: values.length > 1 ? (index / (values.length - 1)) * width : width / 2,
    y: padding + (range === 0 ? usable / 2 : (1 - (value - min) / range) * usable),
  }));
}
