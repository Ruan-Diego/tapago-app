import { backend } from './backend';

/** Repositório de autenticação (AUTH-01, 02, 04, 05). */
export const authRepository = {
  onChange: backend.onAuthChange,
  signIn: backend.signInWithEmail,
  signUp: backend.signUpWithEmail,
  signInWithGoogle: backend.signInWithGoogle,
  sendPasswordReset: backend.sendPasswordReset,
  hasPendingWrites: backend.hasPendingWrites,
  signOut: backend.signOut,
};
