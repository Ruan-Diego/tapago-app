import type { UserProfile } from '@tapago/core';
import { authRepository, profileRepository, watchProfile, type AuthUser } from '@tapago/data';
import { create } from 'zustand';

import { reportError } from '@/platform/crashReports';

interface SessionState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: AuthUser | null;
  profile: UserProfile | null;
  profileError: boolean;
  /** Foto própria em base64; `null` sem foto. */
  avatar: string | null;
  /** Refazendo a configuração pelo Perfil (ONB-06): mostra o onboarding sem apagar nada. */
  redoingOnboarding: boolean;
}

export const useSession = create<SessionState>(() => ({
  status: 'loading',
  user: null,
  profile: null,
  profileError: false,
  avatar: null,
  redoingOnboarding: false,
}));

export function setRedoingOnboarding(redoingOnboarding: boolean) {
  useSession.setState({ redoingOnboarding });
}

/**
 * Liga os listeners de autenticação e de perfil. São criados uma vez por conta,
 * para não gastar leituras da cota do Spark.
 */
export function startSession(): () => void {
  let stopProfile: (() => void) | undefined;
  let stopAvatar: (() => void) | undefined;
  let currentUid: string | null = null;

  const stopAuth = authRepository.onChange((user) => {
    if (user && user.uid === currentUid) {
      useSession.setState({ user });
      return;
    }
    stopProfile?.();
    stopProfile = undefined;
    stopAvatar?.();
    stopAvatar = undefined;
    currentUid = user?.uid ?? null;

    useSession.setState({
      status: user ? 'signedIn' : 'signedOut',
      user,
      profile: null,
      profileError: false,
      avatar: null,
      redoingOnboarding: false,
    });
    if (!user) return;

    stopAvatar = profileRepository.watchAvatar(
      user.uid,
      (avatar) => useSession.setState({ avatar }),
      // Sem a foto o app segue com as iniciais.
      (error) => console.warn('Falha ao ler a foto.', error),
    );

    stopProfile = watchProfile(
      user,
      (profile) => useSession.setState({ profile, profileError: false }),
      (error) => {
        reportError('Falha ao ler o perfil.', error);
        useSession.setState({ profileError: true });
      },
    );
  });

  return () => {
    stopProfile?.();
    stopAvatar?.();
    stopAuth();
  };
}
