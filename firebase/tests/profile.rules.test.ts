import { ACTIVITY_PRESETS, LIMITS, SHOP_PRESETS, newUserProfile } from '@tapago/core';
import { encodeData, type WriteOp } from '@tapago/data/documents';
import { avatarOp, onboardingOps, paths, updateProfileOp } from '@tapago/data/writes';
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
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let env: RulesTestEnvironment;

const at = new Date('2026-11-26T15:00:00Z');
const profile = newUserProfile({
  displayName: 'Ana',
  photoURL: null,
  timezone: 'America/Sao_Paulo',
});
const photo = 'a'.repeat(1000);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tapago-profile',
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
      await setDoc(doc(db, `users/${uid}`), { ...profile, createdAt: serverTimestamp() });
      await setDoc(doc(db, `users/${uid}/avatar/current`), { data: photo, updatedAt: at });
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

const onboarding = {
  profile: {
    name: 'Ana Souza',
    notif: { end: false, warn5: false, weekly: true, daily: false, dailyHour: 20 },
  },
  activities: ACTIVITY_PRESETS.map(({ selected: _selected, ...preset }, index) => ({
    id: `a${index}`,
    values: { ...preset, description: '', streakStep: 0, habit: null },
  })),
  shopItems: SHOP_PRESETS.map(({ selected: _selected, ...values }, index) => ({
    id: `s${index}`,
    values,
  })),
  avatar: photo,
};

describe('onboarding', () => {
  it('grava perfil, atividades, loja e foto em um lote', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, onboardingOps('ana', onboarding, at)));
    const saved = (await getDoc(doc(db, paths.user('ana')))).data();
    expect(saved).toMatchObject({ name: 'Ana Souza', onboardingDone: true, balance: 0 });
  });

  it('só marca como feito quando a conta já estava configurada', async () => {
    await assertSucceeds(commit(as('ana'), onboardingOps('ana', {}, at)));
  });

  it('não grava na conta de outra pessoa', async () => {
    await assertFails(commit(as('bia'), onboardingOps('ana', onboarding, at)));
  });
});

describe('perfil (PROF-01, PROF-02)', () => {
  const update = (patch: object) => commit(as('ana'), [updateProfileOp('ana', patch as never)]);

  it('aceita nome, frase, meta e preferências', async () => {
    await assertSucceeds(
      update({
        name: 'Ana',
        bio: 'Primeiro o que é bom.',
        weeklyGoal: 15_000,
        notif: { end: true, warn5: false, weekly: false },
      }),
    );
  });

  it('aceita lançar em um documento antigo, sem os campos novos', async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), 'users/ana'), { name: 'Ana', balance: 0 });
    });
    await assertSucceeds(update({ weeklyGoal: 100 }));
  });

  it('recusa campos fora da faixa', async () => {
    await assertFails(update({ name: 'x'.repeat(61) }));
    await assertFails(update({ bio: 'x'.repeat(141) }));
    await assertFails(update({ weeklyGoal: -1 }));
    await assertFails(update({ weeklyGoal: 1.5 }));
    await assertFails(update({ weeklyGoal: LIMITS.weeklyGoalMax + 1 }));
    await assertFails(update({ notif: { end: true } }));
    await assertFails(update({ notif: { end: 'sim', warn5: true, weekly: true } }));
    await assertFails(update({ onboardingDone: 'sim' }));
  });
});

describe('foto de perfil', () => {
  it('é lida e trocada só pelo dono', async () => {
    await assertSucceeds(getDoc(doc(as('ana'), paths.avatar('ana'))));
    await assertSucceeds(commit(as('ana'), [avatarOp('ana', 'b'.repeat(10), at)]));
    await assertFails(getDoc(doc(as('bia'), paths.avatar('ana'))));
    await assertFails(commit(as('bia'), [avatarOp('ana', 'b', at)]));
  });

  it('tem limite de tamanho', async () => {
    const db = as('ana');
    await assertSucceeds(commit(db, [avatarOp('ana', 'a'.repeat(LIMITS.avatarMaxChars), at)]));
    await assertFails(commit(db, [avatarOp('ana', 'a'.repeat(LIMITS.avatarMaxChars + 1), at)]));
    await assertFails(commit(db, [avatarOp('ana', '', at)]));
  });

  it('não aceita outro documento, campo extra nem apagar', async () => {
    const db = as('ana');
    await assertFails(setDoc(doc(db, 'users/ana/avatar/outra'), { data: photo, updatedAt: at }));
    await assertFails(
      setDoc(doc(db, paths.avatar('ana')), { data: photo, updatedAt: at, extra: 1 }),
    );
    await assertFails(deleteDoc(doc(db, paths.avatar('ana'))));
  });
});
