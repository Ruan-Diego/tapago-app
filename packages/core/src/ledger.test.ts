import { describe, expect, it } from 'vitest';

import {
  activeInOrder,
  activitySchema,
  balanceFromEntries,
  dailyDelta,
  entryFrom,
  entrySchema,
  entryTypeFor,
  purchaseCheck,
  signedValue,
  type Entry,
  type EntryType,
} from './ledger';

const at = new Date('2026-11-25T12:00:00Z');
const source = { id: 'a1', name: 'Lavar a louça', value: 1000, minutes: 15 };

function entry(id: string, type: Exclude<EntryType, 'reversal' | 'bonus'>, value = 1000): Entry {
  return { id, ...entryFrom(type, { ...source, value }, at, 'web') };
}

function reversalOf(original: Entry): Entry {
  return { ...original, id: `r-${original.id}`, type: 'reversal', reverses: original.id };
}

describe('lançamentos', () => {
  it('copiam nome e valor, e não mudam quando a atividade muda (R2)', () => {
    const activity = { ...source };
    const data = entryFrom('earn', activity, at, 'web');
    activity.name = 'Outro nome';
    activity.value = 5000;
    expect(data).toMatchObject({ refId: 'a1', name: 'Lavar a louça', value: 1000 });
    expect(entrySchema.parse(data)).toEqual(data);
  });

  it('atividade positiva ganha e negativa perde', () => {
    expect(entryTypeFor('positive')).toBe('earn');
    expect(entryTypeFor('negative')).toBe('loss');
  });

  it('recusam valor fracionado ou fora da faixa (R1)', () => {
    const data = entryFrom('earn', source, at, 'web');
    expect(entrySchema.safeParse({ ...data, value: 10.5 }).success).toBe(false);
    expect(entrySchema.safeParse({ ...data, value: 0 }).success).toBe(false);
    expect(entrySchema.safeParse({ ...data, value: 1_000_001 }).success).toBe(false);
    expect(entrySchema.safeParse({ ...data, minutes: 1441 }).success).toBe(false);
  });
});

describe('saldo', () => {
  it('é a soma dos lançamentos; usar um item já pago não debita', () => {
    const entries = [
      entry('1', 'earn', 3000),
      entry('2', 'loss', 800),
      entry('3', 'purchase', 1500),
      entry('4', 'use', 1500),
    ];
    expect(balanceFromEntries(entries)).toBe(700);
  });

  it('pode ficar negativo por atividades negativas (R3)', () => {
    expect(balanceFromEntries([entry('1', 'loss', 800)])).toBe(-800);
  });

  it('volta ao que era com o estorno, sem apagar o original (R8)', () => {
    const earned = entry('1', 'earn', 3000);
    const lost = entry('2', 'loss', 800);
    expect(balanceFromEntries([earned, lost, reversalOf(lost)])).toBe(3000);
    expect(balanceFromEntries([earned, reversalOf(earned)])).toBe(0);
  });

  it('exige o original para calcular um estorno', () => {
    expect(() => signedValue(reversalOf(entry('1', 'earn')))).toThrow();
  });
});

describe('dailyDelta', () => {
  it('separa ganhos, perdas, compras e uso', () => {
    expect(dailyDelta(entry('1', 'earn'))).toEqual({ earned: 1000, posMin: 15, posCount: 1 });
    expect(dailyDelta(entry('2', 'loss'))).toEqual({ lost: 1000, negMin: 15, negCount: 1 });
    expect(dailyDelta(entry('3', 'purchase'))).toEqual({ spent: 1000, buyCount: 1 });
  });

  it('conta o lazer no uso, não na compra (R9)', () => {
    expect(dailyDelta(entry('1', 'purchase'))).not.toHaveProperty('leisureMin');
    expect(dailyDelta(entry('2', 'use'))).toEqual({ leisureMin: 15 });
  });

  it('inverte o agregado no estorno (R8)', () => {
    const original = entry('1', 'earn');
    expect(dailyDelta(reversalOf(original), original)).toEqual({
      earned: -1000,
      posMin: -15,
      posCount: -1,
    });
  });
});

describe('purchaseCheck (R3)', () => {
  it('libera com saldo igual ao preço', () => {
    expect(purchaseCheck(1500, 1500)).toEqual({ allowed: true, missing: 0 });
  });

  it('bloqueia e diz quanto falta', () => {
    expect(purchaseCheck(1000, 1500)).toEqual({ allowed: false, missing: 500 });
    expect(purchaseCheck(-800, 1500)).toEqual({ allowed: false, missing: 2300 });
  });
});

describe('activeInOrder (R10)', () => {
  it('esconde arquivados e respeita a ordem', () => {
    const items = [
      { name: 'b', order: 2, archived: false },
      { name: 'x', order: 0, archived: true },
      { name: 'a', order: 1, archived: false },
    ];
    expect(activeInOrder(items).map((item) => item.name)).toEqual(['a', 'b']);
  });

  it('valida o documento de atividade', () => {
    const doc = {
      ...source,
      description: '',
      kind: 'positive',
      order: 1,
      archived: false,
      createdAt: at,
    };
    expect(activitySchema.safeParse(doc).success).toBe(true);
    expect(activitySchema.safeParse({ ...doc, name: '' }).success).toBe(false);
  });
});
