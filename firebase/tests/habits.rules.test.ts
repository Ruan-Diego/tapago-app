import {
  activityFormSchema,
  activitySchema,
  entrySchema,
  type Activity,
  type Habit,
} from '@tapago/core';
import { decodeData, encodeData, type WriteOp } from '@tapago/data/documents';
import {
  createActivityOp,
  habitBonusOps,
  paths,
  registerActivityOps,
  resetPenaltyOp,
  updateActivityOp,
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

const at = new Date('2026-11-26T15:00:00Z');
const context = { uid: 'ana', at, deviceId: 'web-1', timeZone: 'America/Sao_Paulo' };
const tomorrow = { ...context, at: new Date('2026-11-27T15:00:00Z') };
const habit: Habit = { target: 3, bonus: 5000 };

/** Documento como a versão anterior do app o grava: sem nenhum campo da F6. */
const oldDoc = {
  name: 'Escovar os dentes',
  description: '',
  kind: 'positive',
  value: 5000,
  minutes: 3,
  order: 1,
  archived: false,
  createdAt: at,
};
const negativeDoc = { ...oldDoc, name: 'Reels', kind: 'negative', value: 7000 };
const bonusDoc = {
  type: 'bonus',
  source: 'habit',
  refId: 'a1',
  name: 'Escovar os dentes',
  value: 5000,
  minutes: 0,
  target: 3,
  at,
  deviceId: 'web-1',
};
const earnDoc = {
  type: 'earn',
  refId: 'a1',
  name: 'Escovar os dentes',
  value: 5000,
  minutes: 3,
  at,
  deviceId: 'web-1',
};
const bonusPath = 'users/ana/entries/habit_a1_2026-11-26';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tapago-habits',
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
      await setDoc(doc(db, `users/${uid}/activities/a1`), oldDoc);
      await setDoc(doc(db, `users/${uid}/activities/n1`), negativeDoc);
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

/** A atividade como o app a lê. */
async function activity(db: Firestore, id: string): Promise<Activity> {
  return { ...activitySchema.parse(await read(db, `users/ana/activities/${id}`)), id };
}

describe('registrar com sequência e escalada', () => {
  it('sobe o valor da positiva a cada dia (R14)', async () => {
    const db = as('ana');
    await updateDoc(doc(db, 'users/ana/activities/a1'), { streakStep: 1000 });
    await assertSucceeds(commit(db, registerActivityOps(context, await activity(db, 'a1'), 'e1')));
    await assertSucceeds(commit(db, registerActivityOps(context, await activity(db, 'a1'), 'e2')));
    await assertSucceeds(commit(db, registerActivityOps(tomorrow, await activity(db, 'a1'), 'e3')));

    expect(await read(db, 'users/ana')).toMatchObject({ balance: 5000 + 5000 + 6000 });
    expect((await activity(db, 'a1')).streak).toEqual({ days: 2, lastDay: '2026-11-27' });
    expect(entrySchema.parse(await read(db, 'users/ana/entries/e3'))).toMatchObject({
      value: 6000,
      base: 5000,
      level: 2,
    });
  });

  it('escala a negativa e volta ao início depois de zerar (R15, SEQ-04)', async () => {
    const db = as('ana');
    for (const id of ['e1', 'e2', 'e3']) {
      await assertSucceeds(commit(db, registerActivityOps(context, await activity(db, 'n1'), id)));
    }
    expect(await read(db, 'users/ana')).toMatchObject({ balance: -(7000 + 14_000 + 21_000) });
    expect((await activity(db, 'n1')).penaltyCount).toBe(3);

    await assertSucceeds(commit(db, [resetPenaltyOp('ana', 'n1')]));
    await assertSucceeds(commit(db, registerActivityOps(context, await activity(db, 'n1'), 'e4')));
    expect(await read(db, 'users/ana/entries/e4')).toMatchObject({ value: 7000, level: 1 });
    // O histórico não muda.
    expect(await read(db, 'users/ana/entries/e3')).toMatchObject({ value: 21_000, level: 3 });
  });

  it('aceita no teto (R16)', async () => {
    const db = as('ana');
    await updateDoc(doc(db, 'users/ana/activities/n1'), { penaltyCount: 5000 });
    await assertSucceeds(commit(db, registerActivityOps(context, await activity(db, 'n1'), 'e1')));
    expect(await read(db, 'users/ana/entries/e1')).toMatchObject({
      value: 1_000_000,
      level: 5001,
    });
  });
});

describe('bônus do hábito', () => {
  const habitual = async (db: Firestore) => ({ ...(await activity(db, 'a1')), habit });

  it('entra com o saldo e o dia', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, registerActivityOps(context, await activity(db, 'a1'), 'e1')));
    await assertSucceeds(commit(db, habitBonusOps(context, await habitual(db))));

    expect(await read(db, 'users/ana')).toMatchObject({ balance: 10_000 });
    expect(await read(db, 'users/ana/daily/2026-11-26')).toMatchObject({
      earned: 10_000,
      posCount: 1,
      posMin: 3,
      bonuses: { a1: 1 },
    });
    expect(entrySchema.parse(await read(db, bonusPath))).toMatchObject({ type: 'bonus' });
  });

  it('sai uma vez por dia: o repetido é recusado inteiro e o registro fica (R13)', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, habitBonusOps(context, await habitual(db))));

    // Outro aparelho registra e tenta pagar o mesmo dia.
    const other = { ...context, deviceId: 'android-2', at: new Date('2026-11-26T18:00:00Z') };
    await assertSucceeds(commit(db, registerActivityOps(other, await activity(db, 'a1'), 'e1')));
    await assertFails(commit(db, habitBonusOps(other, await habitual(db))));
    // Mesmo repetindo exatamente a primeira escrita.
    await assertFails(commit(db, habitBonusOps(context, await habitual(db))));

    expect(await read(db, 'users/ana')).toMatchObject({ balance: 10_000 });
    expect(await read(db, 'users/ana/daily/2026-11-26')).toMatchObject({
      earned: 10_000,
      bonuses: { a1: 1 },
    });

    // No dia seguinte sai de novo.
    await assertSucceeds(commit(db, habitBonusOps(tomorrow, await habitual(db))));
  });

  it('não é de outro uid', async () => {
    const db = as('bia');
    const target: Activity & { habit: Habit } = {
      ...activitySchema.parse(oldDoc),
      id: 'a1',
      habit,
    };
    await assertFails(commit(db, habitBonusOps(context, target)));
    await assertFails(commit(db, [resetPenaltyOp('ana', 'n1')]));
    await assertFails(setDoc(doc(db, bonusPath), bonusDoc));
  });

  it('aceita o documento certo', async () => {
    await assertSucceeds(setDoc(doc(as('ana'), bonusPath), bonusDoc));
  });

  it.each([
    ['tempo', { minutes: 3 }],
    ['valor zero', { value: 0 }],
    ['valor acima do teto', { value: 1_000_001 }],
    ['origem desconhecida', { source: 'gift' }],
    ['origem de missão no bônus de hábito', { source: 'mission' }],
    ['meta fora da faixa', { target: 21 }],
    ['nome vazio', { name: '' }],
    ['campo de registro', { level: 1 }],
    ['estorno junto', { reverses: 'e1' }],
    ['outra atividade no id', { refId: 'n1' }],
  ])('recusa bônus com %s', async (_label, change) => {
    await assertFails(setDoc(doc(as('ana'), bonusPath), { ...bonusDoc, ...change }));
  });

  it.each(['source', 'target', 'refId'])('recusa bônus sem %s', async (field) => {
    const { [field as keyof typeof bonusDoc]: _removed, ...rest } = bonusDoc;
    await assertFails(setDoc(doc(as('ana'), bonusPath), rest));
  });

  it.each(['n1', 'habit_a1', 'habit_a1_hoje', 'habit_a1_2026-11-26x', 'habit_n1_2026-11-26'])(
    'recusa bônus com o id %s',
    async (id) => {
      await assertFails(setDoc(doc(as('ana'), `users/ana/entries/${id}`), bonusDoc));
    },
  );

  it('não é reescrito nem apagado', async () => {
    const db = as('ana');
    await setDoc(doc(db, bonusPath), bonusDoc);
    await assertFails(updateDoc(doc(db, bonusPath), { value: 1 }));
    await assertFails(updateDoc(doc(db, bonusPath), { minutes: 1 }));
    await assertFails(deleteDoc(doc(db, bonusPath)));
  });
});

describe('lançamentos de registro', () => {
  it('aceita sem os campos novos (versão anterior do app)', async () => {
    await assertSucceeds(setDoc(doc(as('ana'), 'users/ana/entries/n9'), earnDoc));
  });

  it.each([
    ['só o valor inicial', { base: 5000 }],
    ['só o nível', { level: 2 }],
    ['nível zero', { base: 5000, level: 0 }],
    ['nível fracionado', { base: 5000, level: 1.5 }],
    ['valor inicial fora da faixa', { base: 0, level: 1 }],
    ['nível em uma compra', { type: 'purchase', base: 5000, level: 1 }],
    ['zero minutos', { minutes: 0 }],
    ['origem de bônus', { source: 'habit' }],
    ['meta de bônus', { target: 3 }],
  ])('recusa %s', async (_label, change) => {
    await assertFails(setDoc(doc(as('ana'), 'users/ana/entries/n9'), { ...earnDoc, ...change }));
  });
});

describe('campos novos da atividade', () => {
  const values = activityFormSchema.parse({
    kind: 'positive',
    name: 'Escovar',
    description: '',
    value: '50',
    minutes: '3',
    streakStep: '0',
    isHabit: true,
    habitTarget: '3',
    habitBonus: '50',
  });

  it('cria, edita e desmarca o hábito sem perder a sequência', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, [createActivityOp('ana', 'a2', values, at)]));
    await assertSucceeds(commit(db, registerActivityOps(context, await activity(db, 'a2'), 'e1')));
    await assertSucceeds(commit(db, [updateActivityOp('ana', 'a2', { ...values, habit: null })]));

    const saved = await activity(db, 'a2');
    expect(saved.habit).toBeUndefined();
    expect(saved.streak).toEqual({ days: 1, lastDay: '2026-11-26' });
  });

  it('edita uma atividade antiga, positiva ou negativa', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, [updateActivityOp('ana', 'a1', values)]));
    await assertSucceeds(
      commit(db, [updateActivityOp('ana', 'n1', { ...values, kind: 'negative', habit: null })]),
    );
  });

  it.each([
    ['meta zero', { habit: { target: 0, bonus: 100 } }],
    ['meta acima de 20', { habit: { target: 21, bonus: 100 } }],
    ['meta fracionada', { habit: { target: 1.5, bonus: 100 } }],
    ['hábito sem bônus', { habit: { target: 3 } }],
    ['bônus zero', { habit: { target: 3, bonus: 0 } }],
    ['hábito com campo a mais', { habit: { target: 3, bonus: 100, extra: 1 } }],
    ['hábito nulo', { habit: null }],
    ['aumento negativo', { streakStep: -1 }],
    ['aumento acima do teto', { streakStep: 1_000_001 }],
    ['aumento fracionado', { streakStep: 0.5 }],
    ['sequência de zero dias', { streak: { days: 0, lastDay: '2026-11-26' } }],
    ['sequência sem data', { streak: { days: 1 } }],
    ['sequência com data inválida', { streak: { days: 1, lastDay: 'hoje' } }],
    ['contagem de negativa', { penaltyCount: 1 }],
  ])('recusa positiva com %s', async (_label, change) => {
    await assertFails(updateDoc(doc(as('ana'), paths.activities('ana'), 'a1'), change));
  });

  it.each([
    ['hábito', { habit: { target: 3, bonus: 100 } }],
    ['aumento', { streakStep: 0 }],
    ['sequência', { streak: { days: 1, lastDay: '2026-11-26' } }],
    ['contagem negativa', { penaltyCount: -1 }],
    ['contagem fracionada', { penaltyCount: 1.5 }],
  ])('recusa negativa com %s', async (_label, change) => {
    await assertFails(updateDoc(doc(as('ana'), paths.activities('ana'), 'n1'), change));
  });
});
