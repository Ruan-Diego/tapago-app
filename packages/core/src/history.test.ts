import { describe, expect, it } from 'vitest';

import {
  balanceSeries,
  firstActiveDay,
  goodMinutesPerLeisureHour,
  heatmap,
  linePoints,
  mergeDailies,
  rankings,
  timeShares,
  weeklyMinutes,
} from './history';
import { emptyDaily, type Daily, type Entry, type EntryType } from './ledger';

const daily = (date: string, fields: Partial<Daily>): Daily => ({ ...emptyDaily(date), ...fields });

// 25/11/2026 é uma quarta-feira.
const today = '2026-11-25';
const timeZone = 'America/Sao_Paulo';

function entry(
  id: string,
  type: EntryType,
  refId: string,
  at: string,
  fields: Partial<Entry> = {},
): Entry {
  return {
    id,
    type,
    refId,
    name: refId,
    value: 100,
    minutes: 10,
    at: new Date(at),
    deviceId: 'web',
    ...fields,
  };
}

describe('agregados', () => {
  it('juntam as leituras, com a mais nova ganhando', () => {
    const merged = mergeDailies(
      [daily('2026-11-20', { earned: 1 }), daily('2026-11-25', { earned: 2 })],
      [daily('2026-11-25', { earned: 3 })],
    );
    expect(merged.map((day) => [day.date, day.earned])).toEqual([
      ['2026-11-20', 1],
      ['2026-11-25', 3],
    ]);
  });

  it('apontam o primeiro dia com movimento', () => {
    expect(firstActiveDay([daily('2026-11-25', {}), daily('2026-11-02', {})])).toBe('2026-11-02');
    expect(firstActiveDay([])).toBeNull();
  });
});

describe('divisão do tempo (HIST-03)', () => {
  it('soma 100 mesmo quando o arredondamento sobra', () => {
    expect(timeShares({ posMin: 1, leisureMin: 1, negMin: 1 })).toEqual({
      good: 34,
      leisure: 33,
      bad: 33,
    });
  });

  it('não inventa tempo ruim quando não houve', () => {
    expect(timeShares({ posMin: 2, leisureMin: 1, negMin: 0 })).toEqual({
      good: 67,
      leisure: 33,
      bad: 0,
    });
    expect(timeShares({ posMin: 0, leisureMin: 0, negMin: 0 })).toEqual({
      good: 0,
      leisure: 0,
      bad: 0,
    });
  });

  it('calcula quanto de bom para cada 1 h de lazer', () => {
    expect(goodMinutesPerLeisureHour(180, 120)).toBe(90);
    expect(goodMinutesPerLeisureHour(180, 0)).toBeNull();
  });
});

describe('saldo diário (HIST-04)', () => {
  const dailies = [
    daily('2026-11-22', { earned: 5000 }),
    daily('2026-11-23', { earned: 1000, lost: 300 }),
    daily('2026-11-25', { spent: 200 }),
  ];

  it('volta do saldo atual dia a dia', () => {
    const series = balanceSeries(dailies, 5500, '2026-11-23', today);
    expect(series.start).toBe(5000);
    expect(series.points).toEqual([
      { date: '2026-11-23', balance: 5700 },
      { date: '2026-11-24', balance: 5700 },
      { date: '2026-11-25', balance: 5500 },
    ]);
  });

  it('desconta o que outro aparelho já lançou como amanhã', () => {
    const ahead = [...dailies, daily('2026-11-26', { earned: 1000 })];
    const series = balanceSeries(ahead, 6500, today, today);
    expect(series.points).toEqual([{ date: today, balance: 5500 }]);
  });
});

describe('horas por semana (HIST-05)', () => {
  it('agrupa de segunda a domingo, da mais antiga à atual', () => {
    const weeks = weeklyMinutes(
      [
        daily('2026-11-22', { posMin: 10 }),
        daily('2026-11-23', { posMin: 20, leisureMin: 5 }),
        daily('2026-11-25', { negMin: 7 }),
      ],
      today,
    );
    expect(weeks).toHaveLength(8);
    expect(weeks[0]?.from).toBe('2026-10-05');
    expect(weeks[6]).toEqual({ from: '2026-11-16', posMin: 10, leisureMin: 0, negMin: 0 });
    expect(weeks[7]).toEqual({ from: '2026-11-23', posMin: 20, leisureMin: 5, negMin: 7 });
  });
});

describe('mapa de constância (HIST-06)', () => {
  it('tem 13 semanas de 7 dias, terminando na atual', () => {
    const columns = heatmap([daily(today, { posCount: 9 })], today);
    expect(columns).toHaveLength(13);
    expect(columns.every((column) => column.length === 7)).toBe(true);
    const current = columns[12] ?? [];
    expect(current[0]?.date).toBe('2026-11-23');
    expect(current[2]).toEqual({ date: today, count: 9, level: 4, future: false });
    expect(current[3]?.future).toBe(true);
  });
});

describe('rankings (HIST-07)', () => {
  const filter = { from: '2026-11-19', today, timeZone };

  it('ordena tempo por atividade e por lazer, e perdas por valor', () => {
    const result = rankings(
      [
        entry('1', 'earn', 'louça', '2026-11-24T12:00:00Z', { minutes: 20 }),
        entry('2', 'earn', 'treino', '2026-11-24T13:00:00Z', { minutes: 50 }),
        entry('3', 'earn', 'louça', '2026-11-25T12:00:00Z', {
          minutes: 40,
          name: 'Louça toda',
        }),
        entry('4', 'use', 'jogo', '2026-11-25T12:00:00Z', { minutes: 60 }),
        entry('5', 'loss', 'reels', '2026-11-25T12:00:00Z', { value: 800 }),
        entry('6', 'loss', 'grito', '2026-11-25T12:00:00Z', { value: 1500 }),
        entry('7', 'purchase', 'jogo', '2026-11-25T12:00:00Z'),
      ],
      filter,
    );
    expect(result.activities).toEqual([
      { refId: 'louça', name: 'Louça toda', minutes: 60, value: 200, count: 2 },
      { refId: 'treino', name: 'treino', minutes: 50, value: 100, count: 1 },
    ]);
    expect(result.leisure).toEqual([
      { refId: 'jogo', name: 'jogo', minutes: 60, value: 100, count: 1 },
    ]);
    expect(result.losses.map((row) => row.refId)).toEqual(['grito', 'reels']);
  });

  it('deixa de fora o período anterior, o estornado e o timer aberto', () => {
    const result = rankings(
      [
        // 23:00 do dia 18 em São Paulo, já 19 em UTC.
        entry('velho', 'earn', 'a', '2026-11-19T02:00:00Z'),
        entry('feito', 'earn', 'b', '2026-11-25T12:00:00Z'),
        entry('estorno', 'reversal', 'b', '2026-11-25T12:00:05Z', { reverses: 'feito' }),
        entry('aberto', 'use', 'jogo', '2026-11-25T12:00:00Z'),
      ],
      { ...filter, openUseEntryId: 'aberto' },
    );
    expect(result).toEqual({ activities: [], leisure: [], losses: [] });
  });
});

describe('linha do gráfico', () => {
  it('distribui os pontos na largura e inverte a altura', () => {
    expect(linePoints([0, 50, 100], 200, 108)).toEqual([
      { x: 0, y: 104 },
      { x: 100, y: 54 },
      { x: 200, y: 4 },
    ]);
  });

  it('centraliza a série sem variação', () => {
    expect(linePoints([7, 7], 10, 20).map((point) => point.y)).toEqual([10, 10]);
    expect(linePoints([], 10, 20)).toEqual([]);
  });
});
