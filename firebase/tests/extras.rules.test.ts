/** F5 e o feedback do uso real: guardar o resto do lazer, lembrete, ordem e excluir a conta. */
import { MINUTE_MS, type Session, type ShopItem } from '@tapago/core';
import { encodeData, type WriteOp } from '@tapago/data/documents';
import {
  ACCOUNT_COLLECTIONS,
  markDeletingOp,
  paths,
  purchaseAndUseOps,
  reorderOps,
  stashSessionOps,
  updateProfileOp,
} from '@tapago/data/writes';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let env: RulesTestEnvironment;

const at = new Date('2026-11-26T15:00:00Z');
const later = (minutes: number) => new Date(at.getTime() + minutes * MINUTE_MS);
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
const activity = (order: number) => ({
  name: `Atividade ${order}`,
  description: '',
  kind: 'positive',
  value: 1000,
  minutes: 30,
  order,
  archived: false,
  createdAt: at,
  streakStep: 0,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tapago-extras',
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
      await setDoc(doc(db, `users/${uid}`), { name: uid, balance: 10000 });
      const { id: itemId, ...itemDoc } = item;
      await setDoc(doc(db, `users/${uid}/shopItems/${itemId}`), itemDoc);
      await setDoc(doc(db, `users/${uid}/activities/a1`), activity(1));
      await setDoc(doc(db, `users/${uid}/activities/a2`), activity(2));
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
    const data = encodeData(op.data, { increment, deleteField });
    if (op.kind === 'set') batch.set(ref, data);
    else if (op.kind === 'merge') batch.set(ref, data, { merge: true });
    else batch.update(ref, data);
  }
  return batch.commit();
}

/** Compra e começa a usar agora: a sessão rodando, como o app grava. */
async function startSession(db: Firestore): Promise<Session> {
  const ops = purchaseAndUseOps(context, item, {
    entryId: 'p1',
    sessionId: 'sess1',
    useEntryId: 'u1',
  });
  await assertSucceeds(commit(db, ops));
  const session = ops.find((op) => op.path === paths.session('ana'));
  if (!session || session.kind === 'delete') throw new Error('Sem sessão.');
  return session.data as unknown as Session;
}

describe('guardar o resto do lazer para depois', () => {
  it('encerra a sessão, conta o tempo usado e devolve o resto ao inventário', async () => {
    const db = as('ana');
    const session = await startSession(db);
    const stash = { ...context, at: later(15) };
    await assertSucceeds(
      commit(db, stashSessionOps(stash, session, 15, 45, { shopItemId: 's1', price: 2000 }, 'i9')),
    );
    expect((await getDoc(doc(db, paths.session('ana')))).exists()).toBe(false);
    expect((await getDoc(doc(db, `${paths.inventory('ana')}/i9`))).data()).toMatchObject({
      minutes: 45,
      leftFrom: 60,
      value: 1500,
      purchaseEntryId: 'u1',
    });
    expect((await getDoc(doc(db, `${paths.entries('ana')}/u1`))).data()?.minutes).toBe(15);
  });

  it('não guarda duas vezes a mesma sessão', async () => {
    const db = as('ana');
    const session = await startSession(db);
    const ops = (id: string) =>
      stashSessionOps(context, session, 15, 45, { shopItemId: 's1', price: 2000 }, id);
    await assertSucceeds(commit(db, ops('i9')));
    await assertFails(commit(db, ops('i10')));
  });

  it('recusa um resto maior que a duração original', async () => {
    const base = {
      shopItemId: 's1',
      name: 'Jogar 1 hora',
      value: 100,
      purchaseEntryId: 'u1',
      purchasedAt: at,
    };
    const db = as('ana');
    await assertFails(
      setDoc(doc(db, 'users/ana/inventory/x'), { ...base, minutes: 61, leftFrom: 60 }),
    );
    await assertFails(
      setDoc(doc(db, 'users/ana/inventory/y'), { ...base, minutes: 10, leftFrom: 0 }),
    );
    await assertSucceeds(
      setDoc(doc(db, 'users/ana/inventory/z'), { ...base, minutes: 60, leftFrom: 60 }),
    );
  });
});

describe('lembrete diário', () => {
  const update = (notif: object) => commit(as('ana'), [updateProfileOp('ana', { notif } as never)]);

  it('aceita ligar o lembrete e escolher a hora', async () => {
    await assertSucceeds(
      update({ end: true, warn5: true, weekly: true, daily: true, dailyHour: 7 }),
    );
    // A versão anterior do app grava só os três primeiros.
    await assertSucceeds(update({ end: true, warn5: true, weekly: true }));
  });

  it('recusa hora fora do dia e tipos errados', async () => {
    await assertFails(update({ end: true, warn5: true, weekly: true, daily: true, dailyHour: 24 }));
    await assertFails(update({ end: true, warn5: true, weekly: true, daily: 'sim' }));
    await assertFails(update({ end: true, warn5: true, weekly: true, dailyHour: 1.5 }));
  });
});

describe('reordenar atividades (ACT-06)', () => {
  it('grava a nova ordem só na própria conta', async () => {
    const changes = [
      { id: 'a1', order: 2 },
      { id: 'a2', order: 1 },
    ];
    await assertSucceeds(commit(as('ana'), reorderOps('ana', changes)));
    await assertFails(commit(as('bia'), reorderOps('ana', changes)));
  });
});

describe('excluir a conta (AUTH-05)', () => {
  /** Uma conta com muitos lançamentos e um documento de cada coleção. */
  async function seed(uid: string, entries: number) {
    await env.withSecurityRulesDisabled(async (admin) => {
      const db = admin.firestore();
      const batch = writeBatch(db);
      for (let index = 0; index < entries; index += 1) {
        batch.set(doc(db, `users/${uid}/entries/e${index}`), { type: 'use', at });
      }
      batch.set(doc(db, `users/${uid}/daily/2026-11-26`), { date: '2026-11-26' });
      batch.set(doc(db, `users/${uid}/missions/2026-11-26`), { date: '2026-11-26' });
      batch.set(doc(db, `users/${uid}/inventory/i1`), { purchasedAt: at });
      batch.set(doc(db, `users/${uid}/avatar/current`), { data: 'a', updatedAt: at });
      batch.set(doc(db, `users/${uid}/state/session`), { id: 's' });
      await batch.commit();
    });
  }

  async function allPaths(db: Firestore, uid: string): Promise<string[]> {
    const found: string[] = [];
    for (const { path } of ACCOUNT_COLLECTIONS) {
      const snapshot = await getDocs(collection(db, path(uid)));
      found.push(...snapshot.docs.map((item) => item.ref.path));
    }
    return found;
  }

  it('sem a marca, nada da conta é apagado', async () => {
    await seed('ana', 3);
    const db = as('ana');
    await assertFails(deleteDoc(doc(db, 'users/ana/entries/e0')));
    await assertFails(deleteDoc(doc(db, 'users/ana/daily/2026-11-26')));
    await assertFails(deleteDoc(doc(db, 'users/ana/activities/a1')));
    await assertFails(deleteDoc(doc(db, 'users/ana/avatar/current')));
    await assertFails(deleteDoc(doc(db, 'users/ana')));
  });

  it('com a marca, apaga tudo em lotes grandes e por fim o próprio documento', async () => {
    await seed('ana', 450);
    const db = as('ana');
    await assertSucceeds(commit(db, [markDeletingOp('ana')]));
    const docs = [...(await allPaths(db, 'ana')), paths.avatar('ana'), paths.session('ana')];
    for (let start = 0; start < docs.length; start += 400) {
      const ops = docs.slice(start, start + 400).map((path) => ({ kind: 'delete', path }) as const);
      await assertSucceeds(commit(db, ops));
    }
    expect(await allPaths(db, 'ana')).toEqual([]);
    await assertSucceeds(deleteDoc(doc(db, 'users/ana')));
  });

  it('a marca não volta atrás', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, [markDeletingOp('ana')]));
    await assertFails(commit(db, [updateProfileOp('ana', { deleting: false } as never)]));
    await assertSucceeds(commit(db, [updateProfileOp('ana', { name: 'Ana' })]));
  });

  it('ninguém apaga nem marca a conta de outra pessoa', async () => {
    await seed('ana', 1);
    await assertFails(commit(as('bia'), [markDeletingOp('ana')]));
    await assertSucceeds(commit(as('ana'), [markDeletingOp('ana')]));
    await assertFails(deleteDoc(doc(as('bia'), 'users/ana/entries/e0')));
    await assertFails(deleteDoc(doc(as('bia'), 'users/ana')));
  });
});
