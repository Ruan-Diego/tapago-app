import { newUserProfile, userProfileSchema, type UserProfile } from '@tapago/core';

import { backend } from './backend';
import type { AuthUser, Unsubscribe } from './types';
import { paths } from './writes';

/**
 * Observa `users/{uid}` em tempo real e cria o documento no primeiro login.
 *
 * A criação só acontece quando o *servidor* confirma que o documento não existe: um cache
 * vazio (aparelho novo, sem internet) nunca zera o saldo de uma conta existente.
 */
export function watchProfile(
  user: AuthUser,
  onProfile: (profile: UserProfile) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  let creating = false;

  return backend.watchDoc(
    paths.user(user.uid),
    ({ data, exists, fromCache }) => {
      if (exists) {
        const parsed = userProfileSchema.safeParse(data);
        if (parsed.success) onProfile(parsed.data);
        else onError(parsed.error);
        return;
      }
      if (fromCache || creating) return;
      creating = true;
      const profile = newUserProfile({
        displayName: user.displayName,
        photoURL: user.photoURL,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      backend.createUserDocIfMissing(user.uid, profile).catch((error: Error) => {
        creating = false;
        onError(error);
      });
    },
    onError,
  );
}
