import { describe, expect, it } from 'vitest';

import {
  activitySchema,
  attemptId,
  balanceFromEntries,
  dailySchema,
  entrySchema,
  habitBonusEntry,
  missionBonusEntry,
  reversalEntry,
  reversalId,
  signedValue,
  type Activity,
  type Entry,
  type Mission,
} from './ledger';
import { dailiesFromEntries } from './stats';
import { undoPlan, type Registration, type UndoState } from './undo';

const timeZone = 'America/Sao_Paulo';
const at = new Date('2026-11-26T15:00:00Z');
const date = '2026-11-26';
const yesterday = { days: 2, lastDay: '2026-11-25' };
const today = { days: 3, lastDay: date };
const habit = { target: 2, bonus: 500 };

const activity = (change: Partial<Activity> = {}): Activity => ({
  ...activitySchema.parse({
    name: 'Dentes',
    description: '',
    kind: 'positive',
    value: 1000,
    minutes: 3,
    order: 1,
    archived: false,
    createdAt: at,
  }),
  id: 'a1',
  ...change,
});

const earn: Entry = {
  id: 'e1',
  type: 'earn',
  refId: 'a1',
  name: 'Dentes',
  value: 1000,
  minutes: 3,
  base: 1000,
  level: 1,
  at,
  deviceId: 'web',
};
const loss: Entry = { ...earn, type: 'loss', level: 3, value: 3000 };
const habitBonus: Entry = {
  ...habitBonusEntry({ id: 'a1', name: 'Dentes', habit }, at, 'web'),
  id: `habit_a1_${date}`,
};
const mission: Mission = {
  date,
  activities: [
    { id: 'a1', name: 'Dentes' },
    { id: 'a2', name: 'Ler' },
  ],
  bonus: 10_000,
  createdAt: at,
  completedAt: at,
};

const registration = (change: Partial<Registration> = {}): Registration => ({
  entry: earn,
  previousStreak: yesterday,
  bonuses: [],
  ...change,
});

function state(count: number, change: Partial<UndoState> = {}, bonuses = 0): UndoState {
  return {
    activity: activity({ streak: today }),
    daily: dailySchema.parse({ date, counts: { a1: count }, bonuses: { a1: bonuses } }),
    mission: undefined,
    timeZone,
    ...change,
  };
}

describe('estorno (R8)', () => {
  const data = reversalEntry(earn, at, 'android');

  it('copia o lançamento desfeito, vale o inverso e passa no esquema', () => {
    expect(entrySchema.parse(data)).toEqual(data);
    expect(data).toMatchObject({ reverses: 'e1', reversedType: 'earn', value: 1000 });
    expect(signedValue(data, earn)).toBe(-1000);
    expect(signedValue(reversalEntry(loss, at, 'web'), loss)).toBe(3000);
    expect(balanceFromEntries([earn, { ...data, id: reversalId('e1') }])).toBe(0);
  });

  it('de um bônus não tem tempo', () => {
    expect(entrySchema.safeParse(reversalEntry(habitBonus, at, 'web')).success).toBe(true);
  });

  it('não desfaz compra nem outro estorno', () => {
    expect(() => reversalEntry({ ...earn, type: 'purchase' }, at, 'web')).toThrow();
    expect(() => reversalEntry({ ...data, id: 'r' }, at, 'web')).toThrow();
  });

  it('marca no dia o bônus de hábito estornado', () => {
    const undone = { ...reversalEntry(habitBonus, at, 'web'), id: reversalId(habitBonus.id) };
    const [daily] = dailiesFromEntries([habitBonus, undone], timeZone);
    expect(daily).toMatchObject({ earned: 0, bonuses: { a1: 0 }, undone: { a1: 1 } });
  });

  it('numera o próximo pagamento do bônus', () => {
    expect(attemptId('mission_x', 0)).toBe('mission_x');
    expect(attemptId('mission_x', 2)).toBe('mission_x_2');
  });
});

describe('plano do desfazer', () => {
  it('devolve a sequência de antes quando o dia fica sem registro', () => {
    expect(undoPlan(registration(), state(1)).streak).toEqual(yesterday);
    expect(undoPlan(registration({ previousStreak: undefined }), state(1)).streak).toBeNull();
  });

  it('mantém a sequência se ainda há registro no dia', () => {
    expect(undoPlan(registration(), state(2)).streak).toBeUndefined();
  });

  it('não mexe em uma sequência que já passou para outro dia', () => {
    const moved = activity({ streak: { days: 4, lastDay: '2026-11-27' } });
    expect(undoPlan(registration(), state(1, { activity: moved })).streak).toBeUndefined();
  });

  it.each([
    ['volta um passo', 3, true],
    ['não volta depois de zerar', 0, false],
    ['não volta se zerou e registrou de novo', 1, false],
  ])('na negativa, %s', (_label, penaltyCount, reverts) => {
    const negative = activity({ kind: 'negative', penaltyCount });
    const plan = undoPlan(registration({ entry: loss }), state(1, { activity: negative }));
    expect(plan).toEqual({ revertPenalty: reverts, bonuses: [] });
  });

  it('estorna o bônus de hábito que o registro pagou', () => {
    const plan = undoPlan(registration({ bonuses: [habitBonus] }), state(2, {}, 1));
    expect(plan.bonuses).toEqual([habitBonus]);
  });

  it('mantém o bônus se a meta continua batida', () => {
    const habitual = activity({ habit });
    expect(undoPlan(registration(), state(3, { activity: habitual }, 1)).bonuses).toEqual([]);
  });

  it('acha o bônus pago por outro registro, com o id da vez', () => {
    const habitual = activity({ habit });
    const daily = dailySchema.parse({
      date,
      counts: { a1: 2 },
      bonuses: { a1: 1 },
      undone: { a1: 1 },
    });
    const plan = undoPlan(registration(), state(2, { activity: habitual, daily }));
    expect(plan.bonuses).toMatchObject([{ id: `habit_a1_${date}_1`, value: 500 }]);
  });

  it('estorna o bônus da missão quando a atividade fica sem registro (R18)', () => {
    const plan = undoPlan(registration(), state(1, { mission: { ...mission, reversals: 1 } }));
    expect(plan.bonuses).toMatchObject([{ id: `mission_${date}_1`, value: 10_000, at }]);
  });

  it('usa o bônus da missão que o próprio registro pagou', () => {
    const paid: Entry = { ...missionBonusEntry(mission, at, 'web'), id: `mission_${date}` };
    const plan = undoPlan(registration({ bonuses: [paid] }), state(1, { mission }));
    expect(plan.bonuses).toEqual([paid]);
  });

  it.each<[string, number, Mission]>([
    ['ainda há registro da atividade', 2, mission],
    ['a missão não foi cumprida', 1, { ...mission, completedAt: undefined }],
    [
      'a atividade não é da missão',
      1,
      { ...mission, activities: [mission.activities[1], { id: 'a3', name: 'Correr' }] },
    ],
  ])('mantém o bônus da missão se %s', (_label, count, current) => {
    expect(undoPlan(registration(), state(count, { mission: current })).bonuses).toEqual([]);
  });
});
