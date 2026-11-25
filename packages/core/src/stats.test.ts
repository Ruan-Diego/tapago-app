import { describe, expect, it } from 'vitest';

import { addDays, dayKey, dayRange, weekStart } from './days';
import { emptyDaily, entryFrom, type Daily, type Entry, type EntryType } from './ledger';
import {
  bestStreak,
  countCleanDays,
  currentStreak,
  dailiesFromEntries,
  isCleanDay,
  periodComparison,
  variation,
  weeklyProgress,
} from './stats';

const zone = 'America/Sao_Paulo';
const day = (date: string, totals: Partial<Daily> = {}): Daily => ({
  ...emptyDaily(date),
  ...totals,
});

function entry(id: string, type: Exclude<EntryType, 'reversal'>, iso: string, value = 1000): Entry {
  const source = { id: 'a1', name: 'x', value, minutes: 30 };
  return { id, ...entryFrom(type, source, new Date(iso), 'web') };
}

describe('dias no fuso do usuário', () => {
  it('muda de dia conforme o fuso', () => {
    const instant = new Date('2026-11-26T01:30:00Z');
    expect(dayKey(instant, zone)).toBe('2026-11-25');
    expect(dayKey(instant, 'UTC')).toBe('2026-11-26');
    expect(dayKey(instant, 'Asia/Tokyo')).toBe('2026-11-26');
  });

  it('não quebra com um fuso desconhecido', () => {
    expect(dayKey(new Date('2026-11-25T12:00:00Z'), 'Nada/Aqui')).toBe('2026-11-25');
  });

  it('anda pelo calendário, atravessando mês e ano', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(dayRange('2026-11-29', '2026-12-01')).toEqual([
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
    ]);
  });

  it('começa a semana na segunda (R11)', () => {
    expect(weekStart('2026-11-23')).toBe('2026-11-23'); // segunda
    expect(weekStart('2026-11-29')).toBe('2026-11-23'); // domingo
    expect(weekStart('2026-11-30')).toBe('2026-11-30');
  });
});

describe('dailiesFromEntries', () => {
  it('agrupa por dia no fuso e conta registros por atividade', () => {
    const dailies = dailiesFromEntries(
      [
        entry('1', 'earn', '2026-11-25T13:00:00Z'),
        entry('2', 'earn', '2026-11-26T01:00:00Z'),
        entry('3', 'loss', '2026-11-26T13:00:00Z', 800),
      ],
      zone,
    );
    expect(dailies).toHaveLength(2);
    expect(dailies[0]).toMatchObject({
      date: '2026-11-25',
      earned: 2000,
      posCount: 2,
      counts: { a1: 2 },
    });
    expect(dailies[1]).toMatchObject({ date: '2026-11-26', lost: 800, negCount: 1 });
  });

  it('corrige o dia do original quando o estorno passa da meia-noite (R8)', () => {
    const original = entry('1', 'loss', '2026-11-26T02:59:55Z');
    const reversal: Entry = {
      ...original,
      id: '2',
      type: 'reversal',
      reverses: '1',
      at: new Date('2026-11-26T03:00:02Z'),
    };
    expect(dailiesFromEntries([original, reversal], zone)).toEqual([
      day('2026-11-25', { counts: { a1: 0 } }),
    ]);
  });
});

describe('periodComparison (HIST-02)', () => {
  it('separa o período atual do anterior', () => {
    const dailies = [
      day('2026-11-11', { earned: 100 }), // fora dos dois
      day('2026-11-12', { earned: 200 }), // anterior
      day('2026-11-18', { earned: 300 }), // anterior
      day('2026-11-19', { earned: 400 }), // atual
      day('2026-11-25', { earned: 600 }), // atual
      day('2026-11-26', { earned: 900 }), // futuro
    ];
    const { current, previous } = periodComparison(dailies, '2026-11-25', 7);
    expect(current.earned).toBe(1000);
    expect(previous.earned).toBe(500);
    expect(variation(current.earned, previous.earned)).toBe(100);
  });

  it('não inventa variação sem base de comparação', () => {
    expect(variation(100, 0)).toBeNull();
    expect(variation(50, 100)).toBe(-50);
  });
});

describe('weeklyProgress (R11)', () => {
  it('soma só os ganhos de segunda a domingo, sem descontar perdas e compras', () => {
    const dailies = [
      day('2026-11-22', { earned: 9000 }), // domingo anterior
      day('2026-11-23', { earned: 2000, lost: 1000 }),
      day('2026-11-25', { earned: 3000, spent: 4000 }),
    ];
    expect(weeklyProgress(dailies, '2026-11-25', 10_000)).toEqual({
      earned: 5000,
      goal: 10_000,
      percent: 50,
    });
  });

  it('limita em 100% e aceita meta zerada', () => {
    const dailies = [day('2026-11-25', { earned: 3000 })];
    expect(weeklyProgress(dailies, '2026-11-25', 1000).percent).toBe(100);
    expect(weeklyProgress(dailies, '2026-11-25', 0).percent).toBe(0);
  });
});

describe('dia limpo e sequência (R12)', () => {
  const dailies = [
    day('2026-11-19', { posCount: 1 }),
    day('2026-11-20', { posCount: 2 }),
    day('2026-11-21', { posCount: 1, negCount: 1 }),
    day('2026-11-23', { posCount: 1 }),
    day('2026-11-24', { posCount: 3 }),
  ];

  it('dia limpo é o que não tem atividade negativa', () => {
    expect(isCleanDay(undefined)).toBe(true);
    expect(isCleanDay(day('2026-11-21', { negCount: 1 }))).toBe(false);
    expect(countCleanDays(dailies, '2026-11-19', '2026-11-25')).toBe(6);
  });

  it('hoje sem registro não quebra a sequência de ontem', () => {
    expect(currentStreak(dailies, '2026-11-25')).toBe(2);
  });

  it('zera quando passa um dia inteiro sem atividade positiva', () => {
    expect(currentStreak(dailies, '2026-11-26')).toBe(0);
  });

  it('acha o recorde', () => {
    expect(bestStreak(dailies)).toBe(3);
    expect(bestStreak([])).toBe(0);
  });
});
