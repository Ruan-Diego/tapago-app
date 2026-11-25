/** Web: Firebase JS SDK modular com cache persistente em IndexedDB. */
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth';
import {
  clearIndexedDbPersistence,
  connectFirestoreEmulator,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  runTransaction,
  serverTimestamp,
  terminate,
  waitForPendingWrites,
  type Firestore,
} from 'firebase/firestore';

import { EMULATOR_PORTS, env } from './env';
import { isStillPending } from './pendingWrites';
import type { Backend } from './types';

// Tudo é criado sob demanda: a exportação estática importa este módulo sem navegador.
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function app() {
  if (getApps().length > 0) return getApp();
  if (!env.firebase.apiKey || !env.firebase.projectId) {
    throw new Error('Config do Firebase ausente: copie apps/app/.env.example para apps/app/.env.');
  }
  return initializeApp(env.firebase);
}

function auth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(app());
    authInstance.languageCode = 'pt-BR';
    if (env.useEmulator) {
      connectAuthEmulator(authInstance, `http://${env.emulatorHost}:${EMULATOR_PORTS.auth}`, {
        disableWarnings: true,
      });
    }
  }
  return authInstance;
}

function db(): Firestore {
  if (!dbInstance) {
    dbInstance = initializeFirestore(app(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    if (env.useEmulator) {
      connectFirestoreEmulator(dbInstance, env.emulatorHost, EMULATOR_PORTS.firestore);
    }
  }
  return dbInstance;
}

export const backend: Backend = {
  onAuthChange(listener) {
    return onAuthStateChanged(auth(), (user) =>
      listener(
        user && {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
      ),
    );
  },

  async signInWithEmail(email, password) {
    await signInWithEmailAndPassword(auth(), email, password);
  },

  async signUpWithEmail(email, password) {
    await createUserWithEmailAndPassword(auth(), email, password);
  },

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth(), provider);
  },

  async sendPasswordReset(email) {
    await sendPasswordResetEmail(auth(), email);
  },

  hasPendingWrites(timeoutMs) {
    return isStillPending(waitForPendingWrites(db()), timeoutMs);
  },

  async signOut() {
    const current = db();
    await signOut(auth());
    // A próxima chamada a `db()` cria uma instância nova, com o cache vazio.
    dbInstance = null;
    await terminate(current);
    try {
      await clearIndexedDbPersistence(current);
    } catch (error) {
      // Com outra aba aberta o navegador não deixa apagar o IndexedDB.
      console.warn('Não foi possível limpar o cache local.', error);
    }
  },

  watchUserDoc(uid, onChange, onError) {
    return onSnapshot(
      doc(db(), 'users', uid),
      { includeMetadataChanges: true },
      (snapshot) =>
        onChange({
          data: snapshot.data(),
          exists: snapshot.exists(),
          fromCache: snapshot.metadata.fromCache,
        }),
      onError,
    );
  },

  async createUserDocIfMissing(uid, profile) {
    const ref = doc(db(), 'users', uid);
    await runTransaction(db(), async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) {
        transaction.set(ref, { ...profile, createdAt: serverTimestamp() });
      }
    });
  },
};
