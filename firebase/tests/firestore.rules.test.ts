import { readFileSync } from 'node:fs';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-tapago',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/bia'), { name: 'Bia', balance: 0 });
    await setDoc(doc(db, 'users/bia/entries/e1'), { type: 'earn', value: 100 });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

describe('isolamento por uid', () => {
  it('o dono cria e lê o próprio documento e subcoleções', async () => {
    const db = as('ana');
    await assertSucceeds(setDoc(doc(db, 'users/ana'), { name: 'Ana', balance: 0 }));
    await assertSucceeds(getDoc(doc(db, 'users/ana')));
    await assertSucceeds(setDoc(doc(db, 'users/ana/activities/a1'), { name: 'Louça' }));
    await assertSucceeds(getDocs(collection(db, 'users/ana/activities')));
  });

  it('usuário A não lê dados do usuário B', async () => {
    const db = as('ana');
    await assertFails(getDoc(doc(db, 'users/bia')));
    await assertFails(getDoc(doc(db, 'users/bia/entries/e1')));
    await assertFails(getDocs(collection(db, 'users/bia/entries')));
  });

  it('usuário A não escreve dados do usuário B', async () => {
    const db = as('ana');
    await assertFails(setDoc(doc(db, 'users/bia'), { name: 'x' }));
    await assertFails(updateDoc(doc(db, 'users/bia'), { balance: 999 }));
    await assertFails(setDoc(doc(db, 'users/bia/entries/e2'), { type: 'earn', value: 1 }));
    await assertFails(deleteDoc(doc(db, 'users/bia/entries/e1')));
  });

  it('quem não entrou não lê nem escreve', async () => {
    const db = anonymous();
    await assertFails(getDoc(doc(db, 'users/bia')));
    await assertFails(setDoc(doc(db, 'users/novo'), { name: 'x' }));
  });

  it('nada fora de users/{uid} é acessível', async () => {
    const db = as('ana');
    await assertFails(getDocs(collection(db, 'users')));
    await assertFails(setDoc(doc(db, 'publico/x'), { a: 1 }));
    await assertFails(getDoc(doc(db, 'publico/x')));
  });
});
