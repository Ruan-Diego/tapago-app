import { activitySchema, entrySchema, missionSchema, type Mission } from '@tapago/core';
import { decodeData, encodeData, type WriteOp } from '@tapago/data/documents';
import {
  createMissionOp,
  missionBonusOps,
  registerActivityOps,
  replaceMissionOp,
} from '@tapago/data/writes';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
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

const date = '2026-11-26';
const at = new Date('2026-11-26T15:00:00Z');
const later = new Date('2026-11-26T18:00:00Z');
/** O bônus é gravado 1 ms depois do registro. */
const paidAt = new Date(at.getTime() + 1);
const context = { uid: 'ana', at, deviceId: 'web-1', timeZone: 'America/Sao_Paulo' };
const pair: Mission['activities'] = [
  { id: 'a1', name: 'Louça' },
  { id: 'a2', name: 'Ler' },
];
const otherPair: Mission['activities'] = [
  { id: 'a1', name: 'Louça' },
  { id: 'a3', name: 'Correr' },
];
const mission: Mission = { date, activities: pair, bonus: 10_000, createdAt: at };

const missionPath = `users/ana/missions/${date}`;
const bonusPath = `users/ana/entries/mission_${date}`;
const activityDoc = {
  name: 'Louça',
  description: '',
  kind: 'positive',
  value: 1000,
  minutes: 15,
  order: 1,
  archived: false,
  createdAt: at,
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tapago-missions',
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
      for (const id of ['a1', 'a2']) {
        await setDoc(doc(db, `users/${uid}/activities/${id}`), activityDoc);
      }
      // As atividades dos pares já registradas no dia: é o que o bônus exige.
      await setDoc(doc(db, `users/${uid}/daily/${date}`), {
        date,
        counts: { a1: 1, a2: 1, a3: 1 },
      });
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

async function read(db: Firestore, path: string) {
  const data = (await getDoc(doc(db, path))).data();
  return data && decodeData(data);
}

const create = (db: Firestore, activities = pair, when = at) =>
  commit(db, [createMissionOp('ana', date, activities, when)]);

describe('missão do dia', () => {
  it('é criada e lida como o app a espera', async () => {
    const db = as('ana');
    await assertSucceeds(create(db));
    expect(missionSchema.parse(await read(db, missionPath))).toEqual(mission);
  });

  it('a primeira gravada vale: outro aparelho não grava por cima (R17)', async () => {
    const db = as('ana');
    await assertSucceeds(create(db));
    await assertFails(create(db, otherPair, later));
    // Nem com o mesmo par.
    await assertFails(create(db, pair, later));
    expect(await read(db, missionPath)).toMatchObject({ activities: pair, createdAt: at });
  });

  it('troca o par enquanto não foi cumprida', async () => {
    const db = as('ana');
    await create(db);
    await assertSucceeds(commit(db, [replaceMissionOp('ana', date, otherPair)]));
    expect(await read(db, missionPath)).toMatchObject({ activities: otherPair });
  });

  it('nunca é apagada', async () => {
    const db = as('ana');
    await create(db);
    await assertFails(deleteDoc(doc(db, missionPath)));
  });

  it('não é de outro uid', async () => {
    await create(as('ana'));
    const db = as('bia');
    await assertFails(getDoc(doc(db, missionPath)));
    await assertFails(commit(db, [createMissionOp('ana', '2026-11-27', pair, at)]));
    await assertFails(commit(db, [replaceMissionOp('ana', date, otherPair)]));
    await assertFails(commit(db, missionBonusOps(context, mission)));
  });

  const valid = { date, activities: pair, bonus: 10_000, createdAt: at };

  it.each([
    ['outro bônus', { bonus: 20_000 }],
    ['bônus fracionado', { bonus: 10_000.5 }],
    ['uma atividade', { activities: [pair[0]] }],
    ['três atividades', { activities: [...pair, otherPair[1]] }],
    ['a mesma atividade duas vezes', { activities: [pair[0], pair[0]] }],
    ['atividade sem nome', { activities: [pair[0], { id: 'a2' }] }],
    ['atividade com campo a mais', { activities: [pair[0], { ...pair[1], value: 1 }] }],
    ['atividades fora de uma lista', { activities: 'a1,a2' }],
    ['data de outro dia', { date: '2026-11-27' }],
    ['já cumprida', { completedAt: at }],
    ['campo a mais', { extra: 1 }],
  ])('recusa criar com %s', async (_label, change) => {
    await assertFails(setDoc(doc(as('ana'), missionPath), { ...valid, ...change }));
  });

  it('recusa um id que não é um dia', async () => {
    await assertFails(
      setDoc(doc(as('ana'), 'users/ana/missions/hoje'), { ...valid, date: 'hoje' }),
    );
  });

  it.each([
    ['outro bônus', { bonus: 1 }],
    ['outra data', { date: '2026-11-27' }],
    ['par repetido', { activities: [pair[0], pair[0]] }],
    ['conclusão sem o bônus', { completedAt: at }],
    ['campo a mais', { extra: 1 }],
  ])('recusa mudar para %s', async (_label, change) => {
    const db = as('ana');
    await create(db);
    await assertFails(updateDoc(doc(db, missionPath), change));
  });
});

describe('bônus da missão', () => {
  it('entra com o saldo, o dia e a conclusão (R18)', async () => {
    const db = as('ana');
    for (const [index, id] of ['a1', 'a2'].entries()) {
      const activity = {
        ...activitySchema.parse(await read(db, `users/ana/activities/${id}`)),
        id,
      };
      await assertSucceeds(commit(db, registerActivityOps(context, activity, `e${index}`)));
    }
    await create(db);
    await assertSucceeds(commit(db, missionBonusOps(context, mission)));

    expect(await read(db, 'users/ana')).toMatchObject({ balance: 1000 + 1000 + 10_000 });
    expect(await read(db, `users/ana/daily/${date}`)).toMatchObject({
      earned: 12_000,
      posCount: 2,
      posMin: 30,
    });
    expect((await read(db, `users/ana/daily/${date}`))?.bonuses).toBeUndefined();
    expect(await read(db, missionPath)).toMatchObject({ completedAt: paidAt });
    expect(entrySchema.parse(await read(db, bonusPath))).toMatchObject({
      type: 'bonus',
      source: 'mission',
      activities: pair,
    });
  });

  it('é pago uma vez só: o repetido é recusado inteiro', async () => {
    const db = as('ana');
    await create(db);
    await assertSucceeds(commit(db, missionBonusOps(context, mission)));
    const other = { ...context, at: later, deviceId: 'android-2' };
    await assertFails(commit(db, missionBonusOps(other, mission)));
    // Mesmo repetindo exatamente a primeira escrita.
    await assertFails(commit(db, missionBonusOps(context, mission)));
    expect(await read(db, 'users/ana')).toMatchObject({ balance: 10_000 });
    expect(await read(db, `users/ana/daily/${date}`)).toMatchObject({ earned: 10_000 });
  });

  it('cumprida, a missão não muda mais', async () => {
    const db = as('ana');
    await create(db);
    await commit(db, missionBonusOps(context, mission));
    await assertFails(commit(db, [replaceMissionOp('ana', date, otherPair)]));
    await assertFails(updateDoc(doc(db, missionPath), { completedAt: later }));
    await assertFails(updateDoc(doc(db, missionPath), { completedAt: deleteField() }));
    await assertFails(create(db, pair, later));
    await assertFails(updateDoc(doc(db, bonusPath), { value: 1 }));
    await assertFails(deleteDoc(doc(db, bonusPath)));
  });

  it('recusa o par diferente do gravado', async () => {
    const db = as('ana');
    await create(db);
    await assertFails(commit(db, missionBonusOps(context, { ...mission, activities: otherPair })));
    expect(await read(db, 'users/ana')).toMatchObject({ balance: 0 });
  });

  it.each([
    ['nenhum registro', {}],
    ['só uma das atividades', { a1: 2 }],
  ])('recusa com %s no dia', async (_label, counts) => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), `users/ana/daily/${date}`), { date, counts });
    });
    const db = as('ana');
    await create(db);
    await assertFails(commit(db, missionBonusOps(context, mission)));
  });

  it('recusa o lote sem o saldo', async () => {
    const db = as('ana');
    await create(db);
    const ops = missionBonusOps(context, mission).filter((op) => op.path !== 'users/ana');
    await assertFails(commit(db, ops));
  });

  it('recusa sem a missão gravada', async () => {
    await assertFails(commit(as('ana'), missionBonusOps(context, mission)));
  });

  /** O lote do app com o lançamento adulterado. */
  const withEntry = (change: Record<string, unknown>) =>
    missionBonusOps(context, mission).map((op) =>
      op.kind === 'set' ? { ...op, data: { ...op.data, ...change } } : op,
    );

  it('aceita o lote adulterável sem mudança', async () => {
    const db = as('ana');
    await create(db);
    await assertSucceeds(commit(db, withEntry({})));
  });

  it.each([
    ['outro valor', { value: 20_000 }],
    ['tempo', { minutes: 5 }],
    ['outro dia', { refId: '2026-11-27' }],
    ['nome vazio', { name: '' }],
    ['origem de hábito', { source: 'habit' }],
    ['meta de hábito', { target: 3 }],
    ['horário diferente da conclusão', { at: later }],
  ])('recusa bônus com %s', async (_label, change) => {
    const db = as('ana');
    await create(db);
    await assertFails(commit(db, withEntry(change)));
  });

  it('recusa o lançamento sem marcar a missão', async () => {
    const db = as('ana');
    await create(db);
    await assertFails(commit(db, missionBonusOps(context, mission).slice(0, 3)));
  });

  it('recusa outro id para o lançamento', async () => {
    const db = as('ana');
    await create(db);
    const ops = missionBonusOps(context, mission).map((op) =>
      op.kind === 'set' ? { ...op, path: 'users/ana/entries/e1' } : op,
    );
    await assertFails(commit(db, ops));
  });
});
