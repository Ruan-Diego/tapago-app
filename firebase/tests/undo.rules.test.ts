/** Desfazer (R8): as escritas do app, com o plano calculado em `packages/core`. */
import {
  activitySchema,
  dailySchema,
  entrySchema,
  missionSchema,
  undoPlan,
  type Activity,
  type Mission,
  type Registration,
} from '@tapago/core';
import { decodeData, encodeData, type WriteOp } from '@tapago/data/documents';
import {
  createMissionOp,
  habitBonusOps,
  missionBonusOps,
  registerActivityOps,
  resetPenaltyOp,
  undoBonusOps,
  undoRegistrationOps,
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
const timeZone = 'America/Sao_Paulo';
const context = { uid: 'ana', at, deviceId: 'web-1', timeZone };
const after = (seconds: number) => ({ ...context, at: new Date(at.getTime() + seconds * 1000) });

const base = { description: '', minutes: 5, order: 1, archived: false, createdAt: at };
const habitDoc = {
  ...base,
  name: 'Dentes',
  kind: 'positive',
  value: 500,
  streakStep: 100,
  habit: { target: 1, bonus: 300 },
  streak: { days: 2, lastDay: '2026-11-25' },
};
const plainDoc = { ...base, name: 'Ler', kind: 'positive', value: 1000 };
const negativeDoc = { ...base, name: 'Reels', kind: 'negative', value: 700, penaltyCount: 1 };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tapago-undo',
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
      await setDoc(doc(db, `users/${uid}/activities/h1`), habitDoc);
      await setDoc(doc(db, `users/${uid}/activities/a2`), plainDoc);
      await setDoc(doc(db, `users/${uid}/activities/n1`), negativeDoc);
    }
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

async function read(db: Firestore, path: string) {
  const data = (await getDoc(doc(db, path))).data();
  return data && decodeData(data);
}

async function activity(db: Firestore, id: string): Promise<Activity> {
  return { ...activitySchema.parse(await read(db, `users/ana/activities/${id}`)), id };
}

async function daily(db: Firestore) {
  const data = await read(db, `users/ana/daily/${date}`);
  return data && dailySchema.parse(data);
}

async function mission(db: Firestore): Promise<Mission | undefined> {
  const data = await read(db, `users/ana/missions/${date}`);
  return data && missionSchema.parse(data);
}

const balance = async (db: Firestore) => (await read(db, 'users/ana'))?.balance;

const entryOf = (ops: readonly WriteOp[]) => {
  const [first] = ops;
  if (first?.kind !== 'set') throw new Error('sem lançamento');
  return { ...entrySchema.parse(first.data), id: first.path.split('/').pop()! };
};

/** Registrar como o app: o lançamento e, se houver, os bônus, guardando tudo para o desfazer. */
async function register(
  db: Firestore,
  activityId: string,
  entryId: string,
  seconds = 0,
): Promise<Registration> {
  const when = after(seconds);
  const current = await activity(db, activityId);
  const totals = await daily(db);
  const ops = registerActivityOps(when, current, entryId);
  await assertSucceeds(commit(db, ops));
  const registration: Registration = {
    entry: entryOf(ops),
    previousStreak: current.streak,
    bonuses: [],
  };
  const { habit } = current;
  const count = (totals?.counts[activityId] ?? 0) + 1;
  if (habit && count >= habit.target && (totals?.bonuses[activityId] ?? 0) === 0) {
    const bonus = habitBonusOps(when, { ...current, habit }, totals?.undone[activityId] ?? 0);
    await assertSucceeds(commit(db, bonus));
    registration.bonuses.push(entryOf(bonus));
  }
  return registration;
}

/** Desfazer como o app: o plano sai do estado lido e cada bônus vai em um lote. */
async function undo(db: Firestore, registration: Registration) {
  const when = after(5);
  const plan = undoPlan(registration, {
    activity: await activity(db, registration.entry.refId),
    daily: await daily(db),
    mission: await mission(db),
    timeZone,
  });
  await assertSucceeds(commit(db, undoRegistrationOps(when, registration.entry, plan)));
  for (const bonus of plan.bonuses) await assertSucceeds(commit(db, undoBonusOps(when, bonus)));
  return plan;
}

describe('desfazer um registro (ACT-05)', () => {
  it('estorna o valor, o dia, a sequência e o bônus do hábito', async () => {
    const db = as('ana');
    const registration = await register(db, 'h1', 'e1');
    expect(await balance(db)).toBe(700 + 300);

    await undo(db, registration);

    expect(await balance(db)).toBe(0);
    expect((await activity(db, 'h1')).streak).toEqual(habitDoc.streak);
    expect(await daily(db)).toMatchObject({
      earned: 0,
      posCount: 0,
      posMin: 0,
      counts: { h1: 0 },
      bonuses: { h1: 0 },
      undone: { h1: 1 },
    });
    // O original continua no livro-caixa.
    expect(await read(db, 'users/ana/entries/e1')).toMatchObject({ value: 700 });
    expect(await read(db, 'users/ana/entries/undo_e1')).toMatchObject({
      type: 'reversal',
      reversedType: 'earn',
      value: 700,
    });
  });

  it('paga o bônus de novo quando a meta volta a ser batida, e estorna de novo', async () => {
    const db = as('ana');
    await undo(db, await register(db, 'h1', 'e1'));
    const second = await register(db, 'h1', 'e2', 20);
    expect(second.bonuses[0]?.id).toBe(`habit_h1_${date}_1`);
    expect(await balance(db)).toBe(1000);

    await undo(db, second);
    const third = await register(db, 'h1', 'e3', 40);
    expect(third.bonuses[0]?.id).toBe(`habit_h1_${date}_2`);
    expect(await balance(db)).toBe(1000);
  });

  it('apaga a sequência que não existia', async () => {
    const db = as('ana');
    await undo(db, await register(db, 'a2', 'e1'));
    expect((await activity(db, 'a2')).streak).toBeUndefined();
  });

  it('volta um passo na escalada', async () => {
    const db = as('ana');
    await undo(db, await register(db, 'n1', 'e1'));
    expect(await balance(db)).toBe(0);
    expect((await activity(db, 'n1')).penaltyCount).toBe(1);
  });

  it('depois de zerar o custo, só estorna', async () => {
    const db = as('ana');
    const registration = await register(db, 'n1', 'e1');
    await commit(db, [resetPenaltyOp('ana', 'n1')]);
    await undo(db, registration);
    expect((await activity(db, 'n1')).penaltyCount).toBe(0);
    expect(await balance(db)).toBe(0);
  });

  it('estorna o bônus da missão, que pode ser pago de novo', async () => {
    const db = as('ana');
    await register(db, 'h1', 'e1');
    const pair: Mission['activities'] = [
      { id: 'h1', name: 'Dentes' },
      { id: 'a2', name: 'Ler' },
    ];
    await commit(db, [createMissionOp('ana', date, pair, at)]);
    const registration = await register(db, 'a2', 'e2', 1);
    const first = missionBonusOps(after(1), (await mission(db))!);
    await assertSucceeds(commit(db, first));
    registration.bonuses.push(entryOf(first));
    expect(await balance(db)).toBe(1000 + 1000 + 10_000);

    await undo(db, registration);
    expect(await balance(db)).toBe(1000);
    const reopened = (await mission(db))!;
    expect(reopened.completedAt).toBeUndefined();
    expect(reopened.reversals).toBe(1);

    await register(db, 'a2', 'e3', 30);
    const again = missionBonusOps(after(30), (await mission(db))!);
    expect(entryOf(again).id).toBe(`mission_${date}_1`);
    await assertSucceeds(commit(db, again));
    expect(await balance(db)).toBe(12_000);
  });

  it('não desfaz duas vezes', async () => {
    const db = as('ana');
    const registration = await register(db, 'a2', 'e1');
    await undo(db, registration);
    await assertFails(
      commit(db, undoRegistrationOps(after(8), registration.entry, { revertPenalty: false })),
    );
    expect(await balance(db)).toBe(0);
  });

  it('não é de outro uid', async () => {
    const registration = await register(as('ana'), 'a2', 'e1');
    await assertFails(
      commit(as('bia'), undoRegistrationOps(context, registration.entry, { revertPenalty: false })),
    );
  });
});

describe('estornos que as regras recusam', () => {
  async function setup() {
    const db = as('ana');
    const registration = await register(db, 'a2', 'e1');
    const ops = undoRegistrationOps(after(5), registration.entry, { revertPenalty: false });
    return { db, ops, registration };
  }

  const withEntry = (ops: WriteOp[], change: Record<string, unknown>) =>
    ops.map((op, index) =>
      index === 0 && op.kind === 'set' ? { ...op, data: { ...op.data, ...change } } : op,
    );

  it.each([
    ['outro valor', { value: 900 }],
    ['outro nome', { name: 'x' }],
    ['outra atividade', { refId: 'h1' }],
    ['outro tipo desfeito', { reversedType: 'loss' }],
    ['outros minutos', { minutes: 1 }],
    ['original que não existe', { reverses: 'zz' }],
    ['campo a mais', { level: 1 }],
  ])('recusa %s', async (_label, change) => {
    const { db, ops } = await setup();
    await assertFails(commit(db, withEntry(ops, change)));
  });

  it('recusa outro id', async () => {
    const { db, ops } = await setup();
    const moved = ops.map((op, index) =>
      index === 0 ? { ...op, path: 'users/ana/entries/undo_other' } : op,
    );
    await assertFails(commit(db, moved));
  });

  it('recusa sem devolver o saldo, ou devolvendo outro valor', async () => {
    const { db, ops } = await setup();
    await assertFails(
      commit(
        db,
        ops.filter((op) => op.path !== 'users/ana'),
      ),
    );
    const wrong = ops.map((op) =>
      op.path === 'users/ana' && op.kind === 'update'
        ? { ...op, data: { balance: increment(-1) } }
        : op,
    );
    await assertFails(commit(db, wrong));
  });

  it('recusa estornar uma compra', async () => {
    const db = as('ana');
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'users/ana/entries/p1'), {
        type: 'purchase',
        refId: 's1',
        name: 'Jogar',
        value: 500,
        minutes: 60,
        at,
        deviceId: 'web-1',
      });
    });
    const batch = writeBatch(db);
    batch.set(doc(db, 'users/ana/entries/undo_p1'), {
      type: 'reversal',
      reversedType: 'purchase',
      reverses: 'p1',
      refId: 's1',
      name: 'Jogar',
      value: 500,
      minutes: 60,
      at,
      deviceId: 'web-1',
    });
    batch.update(doc(db, 'users/ana'), { balance: increment(500) });
    await assertFails(batch.commit());
  });

  it('não reescreve nem apaga o estorno', async () => {
    const { db, ops } = await setup();
    await commit(db, ops);
    await assertFails(updateDoc(doc(db, 'users/ana/entries/undo_e1'), { value: 1 }));
    await assertFails(deleteDoc(doc(db, 'users/ana/entries/undo_e1')));
  });

  it('não reabre a missão sem estornar o bônus, nem estorna sem reabrir', async () => {
    const db = as('ana');
    await register(db, 'h1', 'e1');
    await register(db, 'a2', 'e2', 1);
    await commit(db, [
      createMissionOp(
        'ana',
        date,
        [
          { id: 'h1', name: 'Dentes' },
          { id: 'a2', name: 'Ler' },
        ],
        at,
      ),
    ]);
    const payment = missionBonusOps(after(1), (await mission(db))!);
    await assertSucceeds(commit(db, payment));
    const ref = doc(db, `users/ana/missions/${date}`);
    await assertFails(updateDoc(ref, { completedAt: deleteField(), reversals: 1 }));
    const ops = undoBonusOps(after(5), entryOf(payment));
    await assertFails(
      commit(
        db,
        ops.filter((op) => !op.path.includes('/missions/')),
      ),
    );
    await assertSucceeds(commit(db, ops));
  });
});
