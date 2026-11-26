import {
  MINUTE_MS,
  pauseChange,
  resumeChange,
  sessionSchema,
  type InventoryItem,
  type Session,
  type ShopItem,
} from '@tapago/core';
import { decodeData, encodeData, type WriteOp } from '@tapago/data/documents';
import {
  changeSessionOp,
  finishSessionOps,
  paths,
  purchaseAndUseOps,
  purchaseOps,
  startStoredOps,
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
  deleteField,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let env: RulesTestEnvironment;

const at = new Date('2026-11-25T15:00:00Z');
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
const stored: InventoryItem = {
  id: 'i1',
  shopItemId: 's1',
  name: 'Jogar 1 hora',
  value: 2000,
  minutes: 60,
  purchaseEntryId: 'p0',
  purchasedAt: at,
};
const { id: storedId, ...storedDoc } = stored;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tapago-timer',
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
    await setDoc(doc(db, 'users/ana'), { name: 'ana', balance: 10000 });
    await setDoc(doc(db, `users/ana/inventory/${storedId}`), storedDoc);
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

const read = async (db: Firestore, path: string) => (await getDoc(doc(db, path))).data();

async function currentSession(db: Firestore): Promise<Session> {
  const data = await read(db, paths.session('ana'));
  return sessionSchema.parse(decodeData(data!));
}

const useNow = (suffix: string) =>
  purchaseAndUseOps(context, item, {
    entryId: `p${suffix}`,
    useEntryId: `u${suffix}`,
    sessionId: `s${suffix}`,
  });
const startStored = (suffix: string) =>
  startStoredOps(context, stored, { useEntryId: `u${suffix}`, sessionId: `s${suffix}` });

describe('as escritas do timer passam nas regras', () => {
  it('comprar e usar agora', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, useNow('1')));
    expect(await read(db, 'users/ana')).toMatchObject({ balance: 8000 });
    expect(await currentSession(db)).toMatchObject({ id: 's1', status: 'running' });
    const daily = await read(db, 'users/ana/daily/2026-11-25');
    expect(daily).toMatchObject({ spent: 2000, buyCount: 1 });
    expect(daily).not.toHaveProperty('leisureMin');
  });

  it('começar um item guardado tira ele do inventário', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, startStored('1')));
    expect(await read(db, `users/ana/inventory/${storedId}`)).toBeUndefined();
    expect(await read(db, 'users/ana')).toMatchObject({ balance: 10000 });
  });

  it('pausar, retomar e encerrar antes', async () => {
    const db = as('ana');
    await commit(db, useNow('1'));
    const running = await currentSession(db);
    await assertSucceeds(
      commit(db, [changeSessionOp('ana', running, pauseChange(running, later(10)))]),
    );
    const paused = await currentSession(db);
    await assertSucceeds(
      commit(db, [changeSessionOp('ana', paused, resumeChange(paused, later(30)))]),
    );

    await assertSucceeds(
      commit(db, finishSessionOps('ana', await currentSession(db), 25, context.timeZone)),
    );
    expect(await read(db, 'users/ana/entries/u1')).toMatchObject({ minutes: 25 });
    expect(await read(db, 'users/ana/daily/2026-11-25')).toMatchObject({ leisureMin: 25 });
    expect(await read(db, paths.session('ana'))).toBeUndefined();
    // Sem reembolso (R6).
    expect(await read(db, 'users/ana')).toMatchObject({ balance: 8000 });
  });

  it('encerrar com a duração completa', async () => {
    const db = as('ana');
    await commit(db, useNow('1'));
    await assertSucceeds(
      commit(db, finishSessionOps('ana', await currentSession(db), 60, context.timeZone)),
    );
  });
});

describe('um timer por vez (R5)', () => {
  it('recusa começar outro, sem cobrar nem consumir o item', async () => {
    const db = as('ana');
    await commit(db, useNow('1'));

    await assertFails(commit(db, useNow('2')));
    await assertFails(commit(db, startStored('3')));
    expect(await read(db, 'users/ana')).toMatchObject({ balance: 8000 });
    expect(await read(db, `users/ana/inventory/${storedId}`)).toBeDefined();
    expect(await currentSession(db)).toMatchObject({ id: 's1' });
  });

  it('guardar continua liberado com o timer rodando', async () => {
    const db = as('ana');
    await commit(db, useNow('1'));
    await assertSucceeds(
      commit(db, purchaseOps(context, item, { entryId: 'p2', inventoryId: 'i2' })),
    );
  });
});

describe('aparelho desatualizado', () => {
  it('não encerra duas vezes a mesma sessão', async () => {
    const db = as('ana');
    await commit(db, useNow('1'));
    const session = await currentSession(db);
    await commit(db, finishSessionOps('ana', session, 60, context.timeZone));

    await assertFails(commit(db, finishSessionOps('ana', session, 60, context.timeZone)));
    expect(await read(db, 'users/ana/daily/2026-11-25')).toMatchObject({ leisureMin: 60 });
  });

  it('não encerra nem pausa a sessão seguinte', async () => {
    const db = as('ana');
    await commit(db, useNow('1'));
    const old = await currentSession(db);
    await commit(db, finishSessionOps('ana', old, 10, context.timeZone));
    await commit(db, useNow('2'));

    await assertFails(commit(db, finishSessionOps('ana', old, 60, context.timeZone)));
    await assertFails(commit(db, [changeSessionOp('ana', old, pauseChange(old, later(5)))]));
    expect(await currentSession(db)).toMatchObject({ id: 's2', status: 'running' });
  });

  it('não pausa uma sessão que já acabou', async () => {
    const db = as('ana');
    await commit(db, useNow('1'));
    const session = await currentSession(db);
    await commit(db, finishSessionOps('ana', session, 10, context.timeZone));
    await assertFails(
      commit(db, [changeSessionOp('ana', session, pauseChange(session, later(5)))]),
    );
  });

  it('não começa de novo um item já usado', async () => {
    const db = as('ana');
    await commit(db, startStored('1'));
    await commit(db, finishSessionOps('ana', await currentSession(db), 60, context.timeZone));
    await assertFails(commit(db, startStored('2')));
  });
});

describe('campos da sessão', () => {
  const valid = {
    id: 's1',
    status: 'running',
    itemName: 'Filme',
    totalMs: MINUTE_MS,
    startedAt: at,
    endsAt: later(1),
    remainingMs: MINUTE_MS,
    useEntryId: 'u1',
    originDevice: 'web-1',
  };
  const useEntry = {
    type: 'use',
    refId: 's1',
    name: 'Filme',
    value: 100,
    minutes: 1,
    at,
    deviceId: 'web-1',
  };

  const create = (db: Firestore, change: object) => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users/ana/entries/u1'), useEntry);
    batch.set(doc(db, paths.session('ana')), { ...valid, ...change });
    return batch.commit();
  };

  it('aceita a sessão válida', async () => {
    await assertSucceeds(create(as('ana'), {}));
  });

  it.each([
    ['status desconhecido', { status: 'done' }],
    ['começando pausada', { status: 'paused' }],
    ['duração zero', { totalMs: 0 }],
    ['duração longa demais', { totalMs: 86_400_001 }],
    ['restante maior que a duração', { remainingMs: MINUTE_MS + 1 }],
    ['restante negativo', { remainingMs: -1 }],
    ['fim como número', { endsAt: 123 }],
    ['campo a mais', { extra: true }],
    ['sem o lançamento de uso', { useEntryId: 'outro' }],
  ])('recusa sessão com %s', async (_label, change) => {
    await assertFails(create(as('ana'), change));
  });

  it('só muda status, fim e restante', async () => {
    const db = as('ana');
    await create(db, {});
    const ref = doc(db, paths.session('ana'));
    await assertFails(updateDoc(ref, { totalMs: MINUTE_MS * 2 }));
    await assertFails(updateDoc(ref, { itemName: 'Outro' }));
    await assertFails(updateDoc(ref, { useEntryId: 'u2' }));
    await assertSucceeds(updateDoc(ref, { status: 'paused', remainingMs: 1000 }));
  });

  it('não grava os minutos sem apagar a sessão, nem fora da faixa', async () => {
    const db = as('ana');
    await create(db, {});
    await assertFails(updateDoc(doc(db, 'users/ana/entries/u1'), { minutes: 1 }));
    const session = await currentSession(db);
    await assertFails(commit(db, finishSessionOps('ana', session, 0, context.timeZone)));
    await assertFails(commit(db, finishSessionOps('ana', session, 1441, context.timeZone)));
  });

  it('outro uid não lê nem mexe', async () => {
    await create(as('ana'), {});
    const db = as('bia');
    await assertFails(getDoc(doc(db, paths.session('ana'))));
    await assertFails(updateDoc(doc(db, paths.session('ana')), { status: 'paused' }));
    await assertFails(deleteDoc(doc(db, paths.session('ana'))));
    await assertFails(deleteDoc(doc(db, `users/ana/inventory/${storedId}`)));
  });
});
