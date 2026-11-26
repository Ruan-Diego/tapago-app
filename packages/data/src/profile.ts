import {
  avatarSchema,
  newUserProfile,
  userProfileSchema,
  type ActivityValues,
  type ShopItemValues,
  type UserProfile,
} from '@tapago/core';

import { backend } from './backend';
import { decodeData, type DocData } from './documents';
import type { AuthUser, Unsubscribe } from './types';
import {
  avatarOp,
  fixBalanceOp,
  onboardingOps,
  paths,
  updateProfileOp,
  type OnboardingData,
  type ProfilePatch,
} from './writes';

export interface OnboardingChoices extends Pick<OnboardingData, 'profile' | 'avatar'> {
  activities?: readonly ActivityValues[];
  shopItems?: readonly ShopItemValues[];
}

/** Escritas otimistas, como nos outros repositórios. */
export const profileRepository = {
  update(uid: string, patch: ProfilePatch): Promise<void> {
    return backend.commit([updateProfileOp(uid, patch)]);
  },

  /** Somar ao saldo a diferença achada na conferência com o livro-caixa. */
  fixBalance(uid: string, difference: number): Promise<void> {
    return backend.commit([fixBalanceOp(uid, difference)]);
  },

  saveAvatar(uid: string, data: string): Promise<void> {
    return backend.commit([avatarOp(uid, data, new Date())]);
  },

  /** A foto em base64, ou `null` enquanto não houver. */
  watchAvatar(
    uid: string,
    onChange: (data: string | null) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return backend.watchDoc(
      paths.avatar(uid),
      ({ data }) => {
        const parsed = avatarSchema.safeParse(data);
        onChange(parsed.success ? parsed.data.data : null);
      },
      onError,
    );
  },

  completeOnboarding(uid: string, choices: OnboardingChoices = {}): Promise<void> {
    const withId = <Values>(path: string, list: readonly Values[] = []) =>
      list.map((values) => ({ id: backend.newId(path), values }));
    return backend.commit(
      onboardingOps(
        uid,
        {
          profile: choices.profile,
          avatar: choices.avatar,
          activities: withId(paths.activities(uid), choices.activities),
          shopItems: withId(paths.shopItems(uid), choices.shopItems),
        },
        new Date(),
      ),
    );
  },
};

/** Durante a exclusão da conta o documento some de propósito: não pode ser recriado. */
let closingAccount: string | null = null;

export function setClosingAccount(uid: string | null) {
  closingAccount = uid;
}

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
        const parsed = userProfileSchema.safeParse(data && decodeData(data as DocData));
        if (parsed.success) onProfile(parsed.data);
        else onError(parsed.error);
        return;
      }
      if (fromCache || creating || closingAccount === user.uid) return;
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
