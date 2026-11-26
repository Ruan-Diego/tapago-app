import {
  activityFormSchema,
  newSession,
  type Activity,
  type Mission,
  type ShopItem,
} from '@tapago/core';
import { describe, expect, it } from 'vitest';

import { DeleteField, Increment, decodeData, encodeData } from './documents';
import {
  createActivityOp,
  createMissionOp,
  habitBonusOps,
  markDeletingOp,
  missionBonusOps,
  purchaseOps,
  registerActivityOps,
  reorderOps,
  replaceMissionOp,
  resetPenaltyOp,
  stashSessionOps,
  updateActivityOp,
} from './writes';

const at = new Date('2026-11-26T01:00:00Z');
const context = { uid: 'ana', at, deviceId: 'web-1', timeZone: 'America/Sao_Paulo' };
const base = { name: 'Louça', value: 1000, minutes: 15 };
const activity: Activity = {
  ...base,
  id: 'a1',
  description: '',
  kind: 'positive',
  order: 1,
  archived: false,
  createdAt: at,
  streakStep: 0,
  penaltyCount: 0,
};
const item: ShopItem = { ...base, id: 's1', order: 1, archived: false, createdAt: at };
const inc = (amount: number) => new Increment(amount);

describe('registrar atividade', () => {
  it('grava lançamento, saldo, agregado do dia e sequência em um só lote', () => {
    expect(registerActivityOps(context, activity, 'e1')).toEqual([
      {
        kind: 'set',
        path: 'users/ana/entries/e1',
        data: {
          ...base,
          type: 'earn',
          refId: 'a1',
          at,
          deviceId: 'web-1',
          base: 1000,
          level: 1,
        },
      },
      { kind: 'update', path: 'users/ana', data: { balance: inc(1000) } },
      {
        kind: 'merge',
        // O dia é o do fuso do usuário, não o de UTC.
        path: 'users/ana/daily/2026-11-25',
        data: {
          date: '2026-11-25',
          earned: inc(1000),
          posMin: inc(15),
          posCount: inc(1),
          counts: { a1: inc(1) },
        },
      },
      {
        kind: 'update',
        path: 'users/ana/activities/a1',
        data: { streak: { days: 1, lastDay: '2026-11-25' } },
      },
    ]);
  });

  it('paga o valor da sequência e guarda o que o explica (R14)', () => {
    const [entry, user, , update] = registerActivityOps(
      context,
      { ...activity, streakStep: 100, streak: { days: 2, lastDay: '2026-11-24' } },
      'e1',
    );
    expect(entry).toMatchObject({ data: { value: 1200, base: 1000, level: 3 } });
    expect(user).toMatchObject({ data: { balance: inc(1200) } });
    expect(update).toMatchObject({ data: { streak: { days: 3, lastDay: '2026-11-25' } } });
  });

  it('cobra a negativa escalada e soma na contagem (R15)', () => {
    const [entry, user, daily, update] = registerActivityOps(
      context,
      { ...activity, kind: 'negative', penaltyCount: 2 },
      'e1',
    );
    expect(entry).toMatchObject({ data: { type: 'loss', value: 3000, base: 1000, level: 3 } });
    expect(user).toMatchObject({ data: { balance: inc(-3000) } });
    expect(daily).toMatchObject({ data: { lost: inc(3000) } });
    expect(update).toMatchObject({ data: { penaltyCount: inc(1) } });
  });

  it('zera o custo sem tocar no histórico (SEQ-04)', () => {
    expect(resetPenaltyOp('ana', 'a1')).toEqual({
      kind: 'update',
      path: 'users/ana/activities/a1',
      data: { penaltyCount: 0 },
    });
  });

  it('desconta do saldo na atividade negativa', () => {
    const [entry, user, daily] = registerActivityOps(
      context,
      { ...activity, kind: 'negative' },
      'e1',
    );
    expect(entry).toMatchObject({ data: { type: 'loss', value: 1000 } });
    expect(user).toMatchObject({ data: { balance: inc(-1000) } });
    expect(daily).toMatchObject({ data: { lost: inc(1000), negMin: inc(15), negCount: inc(1) } });
  });
});

describe('bônus do hábito', () => {
  const habit = { ...activity, habit: { target: 3, bonus: 5000 } };

  it('é um lote próprio, com id fixo por atividade e dia (R13)', () => {
    expect(habitBonusOps(context, habit)).toEqual([
      {
        kind: 'set',
        path: 'users/ana/entries/habit_a1_2026-11-25',
        data: {
          type: 'bonus',
          source: 'habit',
          refId: 'a1',
          name: 'Louça',
          value: 5000,
          minutes: 0,
          target: 3,
          at: new Date(at.getTime() + 1),
          deviceId: 'web-1',
        },
      },
      { kind: 'update', path: 'users/ana', data: { balance: inc(5000) } },
      {
        kind: 'merge',
        path: 'users/ana/daily/2026-11-25',
        data: { date: '2026-11-25', earned: inc(5000), bonuses: { a1: inc(1) } },
      },
    ]);
  });

  it('não passa para o dia seguinte no último instante', () => {
    // 23:59:59.999 em São Paulo.
    const last = new Date('2026-11-26T02:59:59.999Z');
    const [entry] = habitBonusOps({ ...context, at: last }, habit);
    expect(entry).toMatchObject({
      path: 'users/ana/entries/habit_a1_2026-11-25',
      data: { at: last },
    });
  });
});

describe('comprar e guardar', () => {
  it('debita, cria o item no inventário e não conta tempo de lazer (R9)', () => {
    const ops = purchaseOps(context, item, { entryId: 'e1', inventoryId: 'i1' });
    expect(ops.map((op) => op.path)).toEqual([
      'users/ana/entries/e1',
      'users/ana',
      'users/ana/daily/2026-11-25',
      'users/ana/inventory/i1',
    ]);
    expect(ops[1]).toMatchObject({ data: { balance: inc(-1000) } });
    expect(ops[2]).toMatchObject({ data: { spent: inc(1000), buyCount: inc(1) } });
    expect(ops[2]).not.toHaveProperty('data.leisureMin');
    expect(ops[3]).toMatchObject({ data: { shopItemId: 's1', purchaseEntryId: 'e1' } });
  });
});

describe('atividades', () => {
  const values = activityFormSchema.parse({
    kind: 'negative',
    name: 'Reels',
    description: '',
    value: '8',
    minutes: '30',
    streakStep: '10',
    isHabit: false,
    habitTarget: '',
    habitBonus: '',
  });
  const positive = { ...values, kind: 'positive' as const, streakStep: 1000 };

  it('nasce ativa e no fim da lista', () => {
    expect(createActivityOp('ana', 'a2', values, at)).toMatchObject({
      data: { value: 800, archived: false, order: at.getTime(), createdAt: at },
    });
  });

  it('editar não muda o tipo nem os lançamentos antigos (ACT-02)', () => {
    const op = updateActivityOp('ana', 'a2', values);
    expect(op).toMatchObject({ kind: 'update', path: 'users/ana/activities/a2' });
    expect(op).not.toHaveProperty('data.kind');
  });

  it('não grava aumento nem hábito na negativa', () => {
    for (const op of [
      createActivityOp('ana', 'a2', values, at),
      updateActivityOp('ana', 'a2', values),
    ]) {
      expect(op).not.toHaveProperty('data.streakStep');
      expect(op).not.toHaveProperty('data.habit');
    }
  });

  it('grava o hábito e o apaga quando é desmarcado (HAB-01)', () => {
    const habit = { target: 3, bonus: 5000 };
    expect(createActivityOp('ana', 'a2', { ...positive, habit }, at)).toMatchObject({
      data: { habit, streakStep: 1000 },
    });
    expect(createActivityOp('ana', 'a2', positive, at)).not.toHaveProperty('data.habit');
    expect(updateActivityOp('ana', 'a2', positive)).toMatchObject({
      data: { habit: new DeleteField(), streakStep: 1000 },
    });
    expect(updateActivityOp('ana', 'a2', positive)).not.toHaveProperty('data.streak');
  });
});

describe('tradução para o SDK', () => {
  it('troca os incrementos, inclusive os aninhados, e preserva datas', () => {
    const encoded = encodeData(
      { at, a: inc(2), counts: { x: inc(1) }, habit: new DeleteField() },
      { increment: (n) => `+${n}`, deleteField: () => 'apagar' },
    );
    expect(encoded).toEqual({ at, a: '+2', counts: { x: '+1' }, habit: 'apagar' });
  });

  it('converte timestamps em datas', () => {
    expect(decodeData({ at: { toDate: () => at }, n: 1, list: null })).toEqual({
      at,
      n: 1,
      list: null,
    });
  });
});

describe('missão do dia', () => {
  const date = '2026-11-25';
  const activities: Mission['activities'] = [
    { id: 'a1', name: 'Louça' },
    { id: 'a2', name: 'Ler' },
  ];
  const mission: Mission = { date, activities, bonus: 10_000, createdAt: at };

  it('é criada em um documento por dia, com o bônus fixo', () => {
    expect(createMissionOp('ana', date, activities, at)).toEqual({
      kind: 'set',
      path: 'users/ana/missions/2026-11-25',
      data: { date, activities, bonus: 10_000, createdAt: at },
    });
  });

  it('troca só o par', () => {
    expect(replaceMissionOp('ana', date, activities)).toEqual({
      kind: 'update',
      path: 'users/ana/missions/2026-11-25',
      data: { activities },
    });
  });

  it('paga o bônus com id fixo: lançamento, saldo, dia e conclusão em um lote', () => {
    // Logo depois do registro que cumpriu a missão.
    const paidAt = new Date(at.getTime() + 1);
    expect(missionBonusOps(context, mission)).toEqual([
      {
        kind: 'set',
        path: 'users/ana/entries/mission_2026-11-25',
        data: {
          type: 'bonus',
          source: 'mission',
          refId: date,
          name: 'Missão do dia',
          value: 10_000,
          minutes: 0,
          activities,
          at: paidAt,
          deviceId: 'web-1',
        },
      },
      { kind: 'update', path: 'users/ana', data: { balance: inc(10_000) } },
      {
        kind: 'merge',
        path: 'users/ana/daily/2026-11-25',
        // Sem registro, sem tempo e fora dos bônus de hábito.
        data: { date, earned: inc(10_000) },
      },
      { kind: 'update', path: 'users/ana/missions/2026-11-25', data: { completedAt: paidAt } },
    ]);
  });
});

describe('guardar o resto do lazer (feedback do uso real)', () => {
  const session = newSession({
    id: 'sess1',
    itemName: 'Jogar 1 hora',
    minutes: 60,
    useEntryId: 'u1',
    deviceId: 'web-1',
    at,
  });

  it('encerra a sessão e põe o que sobrou no inventário, no mesmo lote', () => {
    const ops = stashSessionOps(context, session, 15, 45, { shopItemId: 's1', price: 2000 }, 'i9');
    expect(ops.map((op) => [op.kind, op.path])).toEqual([
      ['update', 'users/ana/entries/u1'],
      ['merge', 'users/ana/daily/2026-11-25'],
      ['delete', 'users/ana/state/session'],
      ['set', 'users/ana/inventory/i9'],
    ]);
    expect(ops[3]).toMatchObject({
      data: {
        shopItemId: 's1',
        name: 'Jogar 1 hora',
        value: 1500,
        minutes: 45,
        purchaseEntryId: 'u1',
        purchasedAt: at,
        leftFrom: 60,
      },
    });
  });
});

describe('reordenar e excluir a conta', () => {
  it('grava só o campo order das atividades movidas', () => {
    expect(reorderOps('ana', [{ id: 'a2', order: 1 }])).toEqual([
      { kind: 'update', path: 'users/ana/activities/a2', data: { order: 1 } },
    ]);
  });

  it('a exclusão começa marcando a conta', () => {
    expect(markDeletingOp('ana')).toEqual({
      kind: 'update',
      path: 'users/ana',
      data: { deleting: true },
    });
  });
});
