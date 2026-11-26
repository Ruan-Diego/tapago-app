/** Conferência de saldo e de valor (F4): o saldo muda exatamente pelo que o lançamento cobra. */
import {
  activitySchema,
  type Activity,
  type Entry,
  type ShopItem,
  type Streak,
} from '@tapago/core';
import { decodeData, encodeData, type WriteOp } from '@tapago/data/documents';
import {
  fixBalanceOp,
  purchaseAndUseOps,
  purchaseOps,
  registerActivityOps,
  resetPenaltyOp,
} from '@tapago/data/writes';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteField,
  doc,
  getDoc,
  increment,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let env: RulesTestEnvironment;

const at = new Date('2026-11-26T15:00:00Z');
const context = { uid: 'ana', at, deviceId: 'web-1', timeZone: 'America/Sao_Paulo' };
const item: ShopItem = {
  id: 's1',
  name: 'Jogar 1 hora',
  value: 2000,
  minutes: 60,
  order: 1,
  archived: false,
  createdAt: at,
};
const streak: Streak = { days: 3, lastDay: '2026-11-25' };
const activityDoc = {
  name: 'Louça',
  description: '',
  kind: 'positive',
  value: 1000,
  minutes: 15,
  order: 1,
  archived: false,
  createdAt: at,
  streakStep: 100,
  streak,
};
const negativeDoc = {
  name: 'Reels',
  description: '',
  kind: 'negative',
  value: 700,
  minutes: 20,
  order: 2,
  archived: false,
  createdAt: at,
  penaltyCount: 2,
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tapago-balance',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (admin) => {
    const db = admin.firestore();
    await setDoc(doc(db, 'users/ana'), { name: 'ana', balance: 5000 });
    await setDoc(doc(db, 'users/ana/activities/a1'), activityDoc);
    await setDoc(doc(db, 'users/ana/activities/n1'), negativeDoc);
    const { id, ...itemDoc } = item;
    await setDoc(doc(db, `users/ana/shopItems/${id}`), itemDoc);
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;

function commit(db: Firestore, ops: readonly WriteOp[]) {
  const batch = writeBatch(db);
  for (const op of ops) {
    const ref = doc(db, op.path);
    if (op.kind === 'delete') {
      batch.delete(ref);
      continue;
    }
    const data = encodeData(op.data, { increment, deleteField });
    if (op.kind === 'set') batch.set(ref, data);
    else if (op.kind === 'merge') batch.set(ref, data, { merge: true });
    else batch.update(ref, data);
  }
  return batch.commit();
}

async function activity(db: Firestore, id: string): Promise<Activity> {
  const data = (await getDoc(doc(db, `users/ana/activities/${id}`))).data()!;
  return { ...activitySchema.parse(decodeData(data)), id };
}

const balance = async (db: Firestore) => (await getDoc(doc(db, 'users/ana'))).data()?.balance;

/** O lote do app com uma das operações adulterada. */
function tamper(
  ops: readonly WriteOp[],
  match: (op: WriteOp) => boolean,
  change: Record<string, unknown>,
): WriteOp[] {
  return ops.map((op) =>
    op.kind !== 'delete' && match(op) ? { ...op, data: { ...op.data, ...change } } : op,
  );
}
const isEntry = (op: WriteOp) => op.path.includes('/entries/');
const isUser = (op: WriteOp) => op.path === 'users/ana';
const isActivity = (op: WriteOp) => op.path.includes('/activities/');
const withoutUser = (ops: readonly WriteOp[]) => ops.filter((op) => !isUser(op));
const setBalance = (ops: readonly WriteOp[], amount: Entry['value']) =>
  tamper(ops, isUser, { balance: increment(amount) });

describe('registro: valor e saldo', () => {
  const positive = async (db: Firestore) =>
    registerActivityOps(context, await activity(db, 'a1'), 'e1');
  const negative = async (db: Firestore) =>
    registerActivityOps(context, await activity(db, 'n1'), 'e1');

  it('aceita o lote do app', async () => {
    const db = as('ana');
    // 4º dia de sequência: 1000 + 3 × 100.
    await assertSucceeds(commit(db, await positive(db)));
    expect(await balance(db)).toBe(6300);
  });

  it('aceita o 3º registro da negativa', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, await negative(db)));
    expect(await balance(db)).toBe(5000 - 2100);
  });

  it.each([
    ['saldo diferente do valor', 1400],
    ['saldo ao contrário', -1300],
    ['saldo parado', 0],
  ])('recusa %s', async (_label, amount) => {
    const db = as('ana');
    await assertFails(commit(db, setBalance(await positive(db), amount)));
  });

  it('recusa o lançamento sem o saldo', async () => {
    const db = as('ana');
    await assertFails(commit(db, withoutUser(await positive(db))));
    await assertFails(commit(db, withoutUser(await negative(db))));
  });

  it('recusa o saldo somado de dois lançamentos no mesmo lote', async () => {
    const db = as('ana');
    const ops = await positive(db);
    const twice = [...ops, { ...ops[0]!, path: 'users/ana/entries/e2' } as WriteOp];
    await assertFails(commit(db, setBalance(twice, 2600)));
  });

  it.each([
    ['valor que não é o da sequência', { value: 1400 }],
    ['valor inicial diferente da atividade', { value: 2300, base: 2000 }],
    ['nível sem guardar na sequência', { value: 1200, level: 3 }],
    ['atividade que não existe', { refId: 'zz' }],
    ['ganho em uma negativa', { refId: 'n1' }],
  ])('recusa %s', async (_label, change) => {
    const db = as('ana');
    const value = (change as { value?: number }).value ?? 1300;
    const ops = tamper(await positive(db), isEntry, change);
    await assertFails(commit(db, setBalance(ops, value)));
  });

  it('recusa pular dias da sequência, mesmo com a conta fechando', async () => {
    const db = as('ana');
    let ops = tamper(await positive(db), isEntry, { level: 9, value: 1800 });
    ops = tamper(ops, isActivity, { streak: { days: 9, lastDay: '2026-11-26' } });
    await assertFails(commit(db, setBalance(ops, 1800)));
  });

  it('recusa cobrar acima do próximo nível da escalada', async () => {
    const db = as('ana');
    const ops = tamper(await negative(db), isEntry, { level: 4, value: 2800 });
    await assertFails(commit(db, setBalance(ops, -2800)));
  });

  it('recusa registrar a negativa sem contar', async () => {
    const db = as('ana');
    const ops = (await negative(db)).filter((op) => !isActivity(op));
    await assertFails(commit(db, ops));
  });

  it('aceita um nível já cobrado por outro aparelho sem internet', async () => {
    const db = as('ana');
    const stale = await activity(db, 'n1');
    await commit(db, registerActivityOps(context, stale, 'e1'));
    await assertSucceeds(commit(db, registerActivityOps(context, stale, 'e2')));
  });

  it('recusa o nível antigo depois de zerar o custo', async () => {
    const db = as('ana');
    const stale = await activity(db, 'n1');
    await commit(db, [resetPenaltyOp('ana', 'n1')]);
    await assertFails(commit(db, registerActivityOps(context, stale, 'e1')));
  });
});

describe('compra (R3)', () => {
  const buy = () => purchaseOps(context, item, { entryId: 'p1', inventoryId: 'i1' });

  it('aceita com saldo, até zerar', async () => {
    const db = as('ana');
    await updateDoc(doc(db, 'users/ana'), { balance: 2000 });
    await assertSucceeds(commit(db, buy()));
    expect(await balance(db)).toBe(0);
  });

  it('recusa sem saldo, guardando ou usando', async () => {
    const db = as('ana');
    await updateDoc(doc(db, 'users/ana'), { balance: 1999 });
    await assertFails(commit(db, buy()));
    await assertFails(
      commit(
        db,
        purchaseAndUseOps(context, item, { entryId: 'p1', useEntryId: 'u1', sessionId: 's' }),
      ),
    );
    expect(await balance(db)).toBe(1999);
  });

  it('recusa preço diferente do item', async () => {
    const ops = tamper(buy(), isEntry, { value: 1 });
    await assertFails(commit(as('ana'), setBalance(ops, -1)));
  });

  it('recusa item que não existe', async () => {
    await assertFails(commit(as('ana'), tamper(buy(), isEntry, { refId: 'zz' })));
  });

  it('recusa sem debitar', async () => {
    await assertFails(commit(as('ana'), withoutUser(buy())));
  });
});

describe('conferência do saldo', () => {
  it('o app corrige o saldo sem lançamento', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, [fixBalanceOp('ana', -1200)]));
    expect(await balance(db)).toBe(3800);
  });

  it('mas não o de outra conta', async () => {
    await assertFails(commit(as('bia'), [fixBalanceOp('ana', 1)]));
  });
});
