/** Android: React Native Firebase (cache offline persistente nativo). */
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from '@react-native-firebase/auth';
import {
  clearIndexedDbPersistence,
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  terminate,
  waitForPendingWrites,
  where,
  writeBatch,
  type QuerySnapshot,
} from '@react-native-firebase/firestore';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { decodeData, encodeData, type QueryResult, type QuerySpec } from './documents';
import { EMULATOR_PORTS, env } from './env';
import { isStillPending } from './pendingWrites';
import type { Backend } from './types';

let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;
let googleConfigured = false;

// No emulador do Android, "localhost" é remapeado para 10.0.2.2 pelo React Native Firebase.
function auth() {
  const instance = getAuth();
  if (env.useEmulator && !authEmulatorConnected) {
    authEmulatorConnected = true;
    connectAuthEmulator(instance, `http://${env.emulatorHost}:${EMULATOR_PORTS.auth}`);
  }
  return instance;
}

function db() {
  const instance = getFirestore();
  if (env.useEmulator && !firestoreEmulatorConnected) {
    firestoreEmulatorConnected = true;
    connectFirestoreEmulator(instance, env.emulatorHost, EMULATOR_PORTS.firestore);
  }
  return instance;
}

function configureGoogle() {
  if (googleConfigured) return;
  if (!env.googleWebClientId) {
    throw Object.assign(new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ausente.'), {
      code: 'auth/google-not-configured',
    });
  }
  GoogleSignin.configure({ webClientId: env.googleWebClientId });
  googleConfigured = true;
}

/** Converte os códigos do Google Sign-In para os códigos que o app sabe explicar. */
function toAuthError(error: unknown) {
  if (!isErrorWithCode(error)) return error;
  if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return Object.assign(new Error(error.message), { code: 'auth/play-services' });
  }
  // "10" = DEVELOPER_ERROR: SHA-1 do app não cadastrado no Firebase (HUM-05).
  if (error.code === '10' || error.code === 'DEVELOPER_ERROR') {
    return Object.assign(new Error(error.message), { code: 'auth/google-not-configured' });
  }
  return error;
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
    configureGoogle();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return;
      const credential = GoogleAuthProvider.credential(response.data.idToken);
      await signInWithCredential(auth(), credential);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return;
      throw toAuthError(error);
    }
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
    // Sem isto, o próximo login com Google reusaria a conta anterior sem perguntar.
    if (env.googleWebClientId) {
      configureGoogle();
      await GoogleSignin.signOut().catch(() => undefined);
    }
    try {
      await terminate(current);
      // A instância nativa seguinte nasce sem o emulador: o próximo `db()` precisa religar.
      firestoreEmulatorConnected = false;
      await clearIndexedDbPersistence(current);
    } catch (error) {
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
      const data = encodeData(op.data, increment);
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
};
