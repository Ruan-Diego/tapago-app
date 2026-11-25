import { formatDuration, formatMoney, variation, type DailyTotals } from '@tapago/core';

export interface SummaryCard {
  key: keyof DailyTotals;
  title: string;
  value: string;
  detail: string;
  change: string;
}

const count = (amount: number, one: string, many: string) =>
  `${amount} ${amount === 1 ? one : many}`;

function changeLabel(current: number, previous: number, days: number): string {
  const percent = variation(current, previous);
  if (percent === null) return `sem base nos ${days} dias antes`;
  return `${percent > 0 ? '+' : percent < 0 ? '−' : ''}${Math.abs(percent)}% vs. ${days} dias antes`;
}

/** Os seis cartões do período, cada um com a variação contra o anterior (HIST-02). */
export function summaryCards(
  current: DailyTotals,
  previous: DailyTotals,
  days: number,
): SummaryCard[] {
  const card = (
    key: keyof DailyTotals,
    title: string,
    format: (amount: number) => string,
    detail: string,
  ): SummaryCard => ({
    key,
    title,
    value: format(current[key]),
    detail,
    change: changeLabel(current[key], previous[key], days),
  });

  return [
    card('earned', 'Ganhou', formatMoney, count(current.posCount, 'atividade', 'atividades')),
    card('lost', 'Perdeu', formatMoney, count(current.negCount, 'deslize', 'deslizes')),
    card('spent', 'Gastou', formatMoney, count(current.buyCount, 'compra', 'compras')),
    card('posMin', 'Tempo bom', formatDuration, 'em atividades boas'),
    card(
      'leisureMin',
      'Em lazer',
      formatDuration,
      `≈ ${formatDuration(current.leisureMin / days)} por dia`,
    ),
    card('negMin', 'Tempo perdido', formatDuration, 'em atividades negativas'),
  ];
}
