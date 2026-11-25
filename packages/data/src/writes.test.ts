import { activityFormSchema, type Activity, type ShopItem } from '@tapago/core';
import { describe, expect, it } from 'vitest';

import { Increment, decodeData, encodeData } from './documents';
import { createActivityOp, purchaseOps, registerActivityOps, updateActivityOp } from './writes';

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
};
const item: ShopItem = { ...base, id: 's1', order: 1, archived: false, createdAt: at };
const inc = (amount: number) => new Increment(amount);

describe('registrar atividade', () => {
  it('grava lançamento, saldo e agregado do dia em um só lote', () => {
    expect(registerActivityOps(context, activity, 'e1')).toEqual([
      {
        kind: 'set',
        path: 'users/ana/entries/e1',
        data: { ...base, type: 'earn', refId: 'a1', at, deviceId: 'web-1' },
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
    ]);
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
  });

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
});

describe('tradução para o SDK', () => {
  it('troca os incrementos, inclusive os aninhados, e preserva datas', () => {
    const encoded = encodeData({ at, a: inc(2), counts: { x: inc(1) } }, (n) => `+${n}`);
    expect(encoded).toEqual({ at, a: '+2', counts: { x: '+1' } });
  });

  it('converte timestamps em datas', () => {
    expect(decodeData({ at: { toDate: () => at }, n: 1, list: null })).toEqual({
      at,
      n: 1,
      list: null,
    });
  });
});
