import type { UserProfile } from '@tapago/core';

import type { QueryResult, QuerySpec, WriteOp } from './documents';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type Unsubscribe = () => void;

/** Retrato cru de um documento. */
export interface DocSnapshot {
  data: unknown;
  exists: boolean;
  /** `true` enquanto o servidor ainda não confirmou o que veio do cache local. */
  fromCache: boolean;
}

/**
 * Parte do acesso ao Firebase que muda por plataforma: SDK nativo no Android
 * (`backend.native.ts`) e SDK JS na web (`backend.ts`). Os repositórios usam só esta interface.
 */
export interface Backend {
  onAuthChange(listener: (user: AuthUser | null) => void): Unsubscribe;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  /** Não faz nada se o usuário cancelar a escolha da conta. */
  signInWithGoogle(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  /** Espera até `timeoutMs` as escritas locais chegarem ao servidor. */
  hasPendingWrites(timeoutMs: number): Promise<boolean>;
  /** Encerra a sessão e apaga o cache local do Firestore. */
  signOut(): Promise<void>;
  watchDoc(
    path: string,
    onChange: (snapshot: DocSnapshot) => void,
    onError: (error: Error) => void,
  ): Unsubscribe;
  /** Cria `users/{uid}` em uma transação, sem nunca sobrescrever um documento existente. */
  createUserDocIfMissing(uid: string, profile: UserProfile): Promise<void>;
  /** Id novo para um documento da coleção, gerado no aparelho (funciona offline). */
  newId(collectionPath: string): string;
  /** Um `writeBatch`. Vale na hora no cache local; resolve quando o servidor confirma. */
  commit(ops: readonly WriteOp[]): Promise<void>;
  watchQuery(
    spec: QuerySpec,
    onChange: (result: QueryResult) => void,
    onError: (error: Error) => void,
  ): Unsubscribe;
  /** Leitura única, para as páginas antigas. */
  getQuery(spec: QuerySpec): Promise<QueryResult>;
  /** Leitura única de um documento (do cache, sem internet). */
  getDoc(path: string): Promise<DocSnapshot>;
  /**
   * Apaga o login da conta atual. Recusa com `auth/requires-recent-login` se o último login foi
   * há muito tempo.
   */
  deleteCurrentUser(): Promise<void>;
}
