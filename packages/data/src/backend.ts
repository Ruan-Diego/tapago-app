/** Web: Firebase JS SDK modular com cache persistente em IndexedDB. */
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  deleteUser,
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
  collection,
  connectFirestoreEmulator,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  terminate,
  waitForPendingWrites,
  where,
  writeBatch,
  type Firestore,
  type QuerySnapshot,
} from 'firebase/firestore';

import { decodeData, encodeData, type QueryResult, type QuerySpec } from './documents';
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

function buildQuery(spec: QuerySpec) {
  const { field, direction } = spec.orderBy;
  const constraints = [
    ...(spec.from === undefined ? [] : [where(field, '>=', spec.from)]),
    orderBy(field, direction),
    ...(spec.after === undefined ? [] : [startAfter(spec.after)]),
    ...(spec.limit === undefined ? [] : [limit(spec.limit)]),
  ];
  return query(collection(db(), spec.path), ...constraints);
}

function toResult(snapshot: QuerySnapshot): QueryResult {
  return {
    docs: snapshot.docs.map((item) => ({ id: item.id, data: decodeData(item.data()) })),
    fromCache: snapshot.metadata.fromCache,
  };
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

  watchDoc(path, onChange, onError) {
    return onSnapshot(
      doc(db(), path),
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

  newId(collectionPath) {
    return doc(collection(db(), collectionPath)).id;
  },

  commit(ops) {
    const batch = writeBatch(db());
    for (const op of ops) {
      const ref = doc(db(), op.path);
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
  },

  watchQuery(spec, onChange, onError) {
    return onSnapshot(
      buildQuery(spec),
      { includeMetadataChanges: true },
      (snapshot) => onChange(toResult(snapshot)),
      onError,
    );
  },

  async getQuery(spec) {
    return toResult(await getDocs(buildQuery(spec)));
  },

  async getDoc(path) {
    const snapshot = await getDoc(doc(db(), path));
    return {
      data: snapshot.data(),
      exists: snapshot.exists(),
      fromCache: snapshot.metadata.fromCache,
    };
  },

  async deleteCurrentUser() {
    const user = auth().currentUser;
    if (user) await deleteUser(user);
  },
};
