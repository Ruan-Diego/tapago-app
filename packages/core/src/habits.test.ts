import { describe, expect, it } from 'vitest';

import { addDays, dayKey } from './days';
import {
  aliveStreak,
  earnsHabitBonus,
  habitBonusId,
  habitProgress,
  nextCharge,
  nextStreak,
} from './habits';
import {
  activitySchema,
  balanceFromEntries,
  dailyDelta,
  entrySchema,
  habitBonusEntry,
  type Activity,
  type Entry,
  type Streak,
} from './ledger';
import { LIMITS } from './limits';
import { currentStreak, dailiesFromEntries, weeklyProgress } from './stats';

const today = '2026-11-26';
const at = new Date('2026-11-26T12:00:00Z');
const timeZone = 'America/Sao_Paulo';
const habit = { target: 3, bonus: 5000 };

const document = {
  name: 'Escovar os dentes',
  description: '',
  kind: 'positive' as const,
  value: 10_000,
  minutes: 3,
  order: 1,
  archived: false,
  createdAt: at,
};
const positive: Activity = { ...activitySchema.parse(document), id: 'a1', streakStep: 1000 };
const negative: Activity = {
  ...activitySchema.parse({ ...document, kind: 'negative', value: 7000 }),
  id: 'n1',
};

/** Registra uma vez por dia nos dias informados e devolve o que cada registro pagou. */
function payments(activity: Activity, days: readonly string[]): number[] {
  let streak: Streak | undefined;
  return days.map((day) => {
    const { value } = nextCharge({ ...activity, streak }, day);
    streak = nextStreak(streak, day);
    return value;
  });
}

describe('atividades que já existiam', () => {
  it('ficam sem hábito, com aumento zero e contagens zeradas', () => {
    const parsed = activitySchema.parse(document);
    expect(parsed).toMatchObject({ streakStep: 0, penaltyCount: 0 });
    expect(parsed.habit).toBeUndefined();
    expect(parsed.streak).toBeUndefined();
    expect(nextCharge(parsed, today)).toEqual({ value: 10_000, level: 1 });
  });
});

describe('sequência positiva (R14)', () => {
  it('soma o aumento a cada dia seguido', () => {
    const days = [0, 1, 2, 3].map((offset) => addDays(today, offset));
    expect(payments(positive, days)).toEqual([10_000, 11_000, 12_000, 13_000]);
  });

  it('atravessa a virada de mês e de ano', () => {
    expect(payments(positive, ['2026-12-31', '2027-01-01', '2027-01-02'])).toEqual([
      10_000, 11_000, 12_000,
    ]);
  });

  it('paga o mesmo valor em todos os registros do dia', () => {
    const days = [today, today, addDays(today, 1), addDays(today, 1), addDays(today, 1)];
    expect(payments(positive, days)).toEqual([10_000, 10_000, 11_000, 11_000, 11_000]);
  });

  it('volta ao valor inicial depois de um dia inteiro sem registro', () => {
    const days = [today, addDays(today, 1), addDays(today, 3), addDays(today, 4)];
    expect(payments(positive, days)).toEqual([10_000, 11_000, 10_000, 11_000]);
  });

  it('conta os dias mesmo com aumento zero', () => {
    const streak = nextStreak({ days: 4, lastDay: addDays(today, -1) }, today);
    expect(streak).toEqual({ days: 5, lastDay: today });
    expect(nextCharge({ ...positive, streakStep: 0, streak }, today).value).toBe(10_000);
  });

  it('continua viva no dia seguinte e some depois de um dia vazio', () => {
    const streak = { days: 4, lastDay: today };
    expect(aliveStreak(streak, today)).toBe(4);
    expect(aliveStreak(streak, addDays(today, 1))).toBe(4);
    expect(aliveStreak(streak, addDays(today, 2))).toBe(0);
    expect(aliveStreak(undefined, today)).toBe(0);
  });

  it('não regride quando outro aparelho já registrou em um dia à frente', () => {
    const ahead = { days: 3, lastDay: addDays(today, 1) };
    expect(nextCharge({ ...positive, streak: ahead }, today)).toEqual({ value: 12_000, level: 3 });
    expect(nextStreak(ahead, today)).toBe(ahead);
  });

  it('vira o dia no fuso do usuário', () => {
    // 23:30 e 00:30 em São Paulo são o mesmo dia em UTC.
    const night = dayKey(new Date('2026-11-27T02:30:00Z'), timeZone);
    const dawn = dayKey(new Date('2026-11-27T03:30:00Z'), timeZone);
    expect([night, dawn]).toEqual(['2026-11-26', '2026-11-27']);
    expect(payments(positive, [night, dawn])).toEqual([10_000, 11_000]);
  });
});

describe('escalada negativa (R15)', () => {
  it('soma o valor inicial a cada registro, também no mesmo dia', () => {
    const costs = [0, 1, 2, 3].map(
      (penaltyCount) => nextCharge({ ...negative, penaltyCount }, today).value,
    );
    expect(costs).toEqual([7000, 14_000, 21_000, 28_000]);
  });

  it('não zera com o tempo', () => {
    const charge = nextCharge({ ...negative, penaltyCount: 4 }, addDays(today, 90));
    expect(charge).toEqual({ value: 35_000, level: 5 });
  });
});

describe('teto (R16)', () => {
  it('limita a positiva e a negativa a R$ 10.000', () => {
    const streak = { days: 5000, lastDay: today };
    expect(nextCharge({ ...positive, streak }, today).value).toBe(LIMITS.valueMax);
    const charge = nextCharge({ ...negative, penaltyCount: 500 }, today);
    expect(charge).toEqual({ value: LIMITS.valueMax, level: 501 });
  });
});

describe('hábito diário (R13)', () => {
  const activity = { ...positive, habit };

  it('mostra o progresso do dia e para na meta', () => {
    expect(habitProgress(activity, 0)).toEqual({ done: 0, target: 3, complete: false });
    expect(habitProgress(activity, 2)).toEqual({ done: 2, target: 3, complete: false });
    expect(habitProgress(activity, 5)).toEqual({ done: 3, target: 3, complete: true });
    expect(habitProgress(positive, 2)).toBeNull();
    expect(habitProgress({ ...negative, habit }, 2)).toBeNull();
  });

  it('dá o bônus ao atingir a meta, uma vez por dia', () => {
    expect(earnsHabitBonus(activity, 2, false)).toBe(false);
    expect(earnsHabitBonus(activity, 3, false)).toBe(true);
    expect(earnsHabitBonus(activity, 4, true)).toBe(false);
    expect(earnsHabitBonus(positive, 3, false)).toBe(false);
  });

  it('recupera um bônus que ficou sem sair ao passar da meta', () => {
    expect(earnsHabitBonus(activity, 5, false)).toBe(true);
  });

  it('tem um id por atividade e por dia', () => {
    expect(habitBonusId('a1', today)).toBe('habit_a1_2026-11-26');
  });
});

describe('lançamento de bônus', () => {
  const bonus = habitBonusEntry({ ...positive, habit }, at, 'web');

  it('copia nome, valor e meta, sem tempo (R2)', () => {
    expect(bonus).toEqual({
      type: 'bonus',
      source: 'habit',
      refId: 'a1',
      name: 'Escovar os dentes',
      value: 5000,
      minutes: 0,
      target: 3,
      at,
      deviceId: 'web',
    });
    expect(entrySchema.parse(bonus)).toEqual(bonus);
  });

  it('só o bônus tem zero minutos e origem', () => {
    expect(entrySchema.safeParse({ ...bonus, minutes: 3 }).success).toBe(false);
    expect(entrySchema.safeParse({ ...bonus, source: undefined }).success).toBe(false);
    const { source: _source, ...earn } = { ...bonus, type: 'earn' as const };
    expect(entrySchema.safeParse(earn).success).toBe(false);
  });

  it('soma no saldo e nos ganhos, sem contar como registro nem tempo', () => {
    const entry: Entry = { ...bonus, id: 'habit_a1_2026-11-26' };
    expect(balanceFromEntries([entry])).toBe(5000);
    expect(dailyDelta(entry)).toEqual({ earned: 5000 });

    const dailies = dailiesFromEntries([entry], timeZone);
    expect(dailies[0]).toMatchObject({
      earned: 5000,
      posCount: 0,
      posMin: 0,
      counts: {},
      bonuses: { a1: 1 },
    });
    expect(weeklyProgress(dailies, today, 10_000).earned).toBe(5000);
    expect(currentStreak(dailies, today)).toBe(0);

    const reversal: Entry = { ...entry, id: 'r1', type: 'reversal', reverses: entry.id };
    expect(dailiesFromEntries([entry, reversal], timeZone)[0]).toMatchObject({
      earned: 0,
      bonuses: { a1: 0 },
    });
  });
});
