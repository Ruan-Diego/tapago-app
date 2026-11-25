import { activityFormSchema, type Activity, type ShopItem } from '@tapago/core';
import { encodeData, type WriteOp } from '@tapago/data/documents';
import {
  archiveOp,
  createActivityOp,
  createShopItemOp,
  paths,
  purchaseOps,
  registerActivityOps,
  updateActivityOp,
  updateShopItemOp,
} from '@tapago/data/writes';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
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

const at = new Date('2026-11-25T15:00:00Z');
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

const activityDoc = { ...base, description: '', kind: 'positive', order: 1, archived: false };
const entryDoc = { ...base, type: 'earn', refId: 'a1', deviceId: 'web-1', at };
const useDoc = { ...entryDoc, type: 'use' };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tapago-ledger',
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
    for (const uid of ['ana', 'bia']) {
      await setDoc(doc(db, `users/${uid}`), { name: uid, balance: 0 });
      await setDoc(doc(db, `users/${uid}/entries/earn1`), entryDoc);
      await setDoc(doc(db, `users/${uid}/entries/use1`), useDoc);
      await setDoc(doc(db, `users/${uid}/activities/a0`), { ...activityDoc, createdAt: at });
    }
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;

/** Grava as operações do app exatamente como o backend da web faz. */
function commit(db: Firestore, ops: readonly WriteOp[]) {
  const batch = writeBatch(db);
  for (const op of ops) {
    const ref = doc(db, op.path);
    if (op.kind === 'delete') {
      batch.delete(ref);
      continue;
    }
    const data = encodeData(op.data, increment);
    if (op.kind === 'set') batch.set(ref, data);
    else if (op.kind === 'merge') batch.set(ref, data, { merge: true });
    else batch.update(ref, data);
  }
  return batch.commit();
}

describe('as escritas do app passam nas regras', () => {
  it('registrar: lançamento, saldo e dia, inclusive somando no mesmo dia', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, registerActivityOps(context, activity, 'e1')));
    await assertSucceeds(commit(db, registerActivityOps(context, activity, 'e2')));
    await assertSucceeds(
      commit(db, registerActivityOps(context, { ...activity, kind: 'negative' }, 'e3')),
    );

    const user = await getDoc(doc(db, 'users/ana'));
    const daily = await getDoc(doc(db, 'users/ana/daily/2026-11-25'));
    expect(user.data()?.balance).toBe(1000);
    expect(daily.data()).toMatchObject({
      earned: 2000,
      lost: 1000,
      posCount: 2,
      negCount: 1,
      counts: { a1: 3 },
    });
  });

  it('comprar e guardar', async () => {
    await assertSucceeds(
      commit(as('ana'), purchaseOps(context, item, { entryId: 'p1', inventoryId: 'i1' })),
    );
  });

  it('criar, editar e arquivar atividade e item da loja', async () => {
    const db = as('ana');
    const values = activityFormSchema.parse({
      kind: 'positive',
      name: 'Estudar',
      description: '1 hora',
      value: '15',
      minutes: '60',
    });
    await assertSucceeds(commit(db, [createActivityOp('ana', 'a2', values, at)]));
    await assertSucceeds(commit(db, [updateActivityOp('ana', 'a2', values)]));
    await assertSucceeds(commit(db, [archiveOp(paths.activities('ana'), 'a2')]));
    await assertSucceeds(commit(db, [createShopItemOp('ana', 's2', values, at)]));
    await assertSucceeds(commit(db, [updateShopItemOp('ana', 's2', values)]));
    await assertSucceeds(commit(db, [archiveOp(paths.shopItems('ana'), 's2')]));
  });
});

describe('outro uid não escreve nada', () => {
  it('nem pelo lote do app, nem coleção por coleção', async () => {
    const db = as('bia');
    await assertFails(commit(db, registerActivityOps(context, activity, 'e1')));
    await assertFails(commit(db, purchaseOps(context, item, { entryId: 'p1', inventoryId: 'i1' })));
    await assertFails(updateDoc(doc(db, 'users/ana/activities/a0'), { name: 'x' }));
    await assertFails(updateDoc(doc(db, 'users/ana/entries/use1'), { minutes: 1 }));
    await assertFails(setDoc(doc(db, 'users/ana/daily/2026-11-25'), { date: '2026-11-25' }));
    await assertFails(getDoc(doc(db, 'users/ana/activities/a0')));
  });
});

describe('livro-caixa', () => {
  it('não apaga lançamento', async () => {
    await assertFails(deleteDoc(doc(as('ana'), 'users/ana/entries/earn1')));
    await assertFails(deleteDoc(doc(as('ana'), 'users/ana/entries/use1')));
  });

  it('não reescreve um lançamento', async () => {
    const db = as('ana');
    await assertFails(setDoc(doc(db, 'users/ana/entries/earn1'), { ...entryDoc, value: 9999 }));
    await assertFails(updateDoc(doc(db, 'users/ana/entries/earn1'), { minutes: 1 }));
    await assertFails(updateDoc(doc(db, 'users/ana/entries/use1'), { value: 1 }));
    await assertFails(updateDoc(doc(db, 'users/ana/entries/use1'), { minutes: 1, name: 'x' }));
  });

  it('não muda os minutos de um uso fora do encerramento da sessão', async () => {
    await assertFails(updateDoc(doc(as('ana'), 'users/ana/entries/use1'), { minutes: 7 }));
  });

  it.each([
    ['valor zero', { value: 0 }],
    ['valor negativo', { value: -100 }],
    ['valor alto demais', { value: 1_000_001 }],
    ['valor fracionado', { value: 10.5 }],
    ['minutos zero', { minutes: 0 }],
    ['minutos demais', { minutes: 1441 }],
    ['nome vazio', { name: '' }],
    ['nome longo', { name: 'x'.repeat(61) }],
    ['tipo desconhecido', { type: 'bonus' }],
    ['data como texto', { at: '2026-11-25' }],
    ['campo a mais', { extra: true }],
    ['estorno sem original', { type: 'reversal' }],
    ['ganho que aponta estorno', { reverses: 'use1' }],
  ])('recusa lançamento com %s', async (_label, change) => {
    await assertFails(setDoc(doc(as('ana'), 'users/ana/entries/n1'), { ...entryDoc, ...change }));
  });

  it('aceita os limites', async () => {
    const db = as('ana');
    await assertSucceeds(
      setDoc(doc(db, 'users/ana/entries/n1'), {
        ...entryDoc,
        value: 1_000_000,
        minutes: 1440,
        name: 'x'.repeat(60),
      }),
    );
  });
});

describe('atividades, loja, inventário e dia', () => {
  it('não apaga: arquiva (R10)', async () => {
    await assertFails(deleteDoc(doc(as('ana'), 'users/ana/activities/a0')));
  });

  it.each([
    ['nome vazio', { name: '' }],
    ['valor fora da faixa', { value: 0 }],
    ['minutos fora da faixa', { minutes: 2000 }],
    ['tipo inválido', { kind: 'neutral' }],
    ['descrição longa', { description: 'x'.repeat(141) }],
    ['campo a mais', { extra: 1 }],
  ])('recusa atividade com %s', async (_label, change) => {
    const db = as('ana');
    await assertFails(
      setDoc(doc(db, 'users/ana/activities/n1'), { ...activityDoc, createdAt: at, ...change }),
    );
    await assertFails(updateDoc(doc(db, 'users/ana/activities/a0'), change));
  });

  it('recusa item de loja e de inventário inválidos', async () => {
    const db = as('ana');
    const shop = { ...base, order: 1, archived: false, createdAt: at };
    await assertFails(setDoc(doc(db, 'users/ana/shopItems/n1'), { ...shop, value: 0 }));
    await assertFails(setDoc(doc(db, 'users/ana/shopItems/n1'), { ...shop, kind: 'positive' }));
    await assertFails(setDoc(doc(db, 'users/ana/inventory/n1'), { ...base }));
  });

  it('recusa agregado com data diferente do id ou valor não inteiro', async () => {
    const db = as('ana');
    const ref = doc(db, 'users/ana/daily/2026-11-25');
    await assertFails(setDoc(ref, { date: '2026-11-24' }));
    await assertFails(setDoc(ref, { date: '2026-11-25', earned: '10' }));
    await assertFails(setDoc(ref, { date: '2026-11-25', other: 1 }));
    await assertFails(setDoc(doc(db, 'users/ana/daily/hoje'), { date: 'hoje' }));
  });

  it('o documento do usuário exige saldo inteiro e não é apagado', async () => {
    const db = as('ana');
    await assertFails(updateDoc(doc(db, 'users/ana'), { balance: 1.5 }));
    await assertFails(updateDoc(doc(db, 'users/ana'), { balance: '10' }));
    await assertFails(deleteDoc(doc(db, 'users/ana')));
  });

  it('coleções ainda não liberadas ficam fechadas', async () => {
    await assertFails(setDoc(doc(as('ana'), 'users/ana/outra/x'), { a: 1 }));
  });
});
