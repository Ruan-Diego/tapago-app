import type { UserProfile } from '@tapago/core';
import { authRepository, watchProfile, type AuthUser } from '@tapago/data';
import { create } from 'zustand';

interface SessionState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: AuthUser | null;
  profile: UserProfile | null;
  profileError: boolean;
}

export const useSession = create<SessionState>(() => ({
  status: 'loading',
  user: null,
  profile: null,
  profileError: false,
}));

/**
 * Liga os listeners de autenticação e de perfil. São criados uma vez por conta,
 * para não gastar leituras da cota do Spark.
 */
export function startSession(): () => void {
  let stopProfile: (() => void) | undefined;
  let currentUid: string | null = null;

  const stopAuth = authRepository.onChange((user) => {
    if (user && user.uid === currentUid) {
      useSession.setState({ user });
      return;
    }
    stopProfile?.();
    stopProfile = undefined;
    currentUid = user?.uid ?? null;

    useSession.setState({
      status: user ? 'signedIn' : 'signedOut',
      user,
      profile: null,
      profileError: false,
    });
    if (!user) return;

    stopProfile = watchProfile(
      user,
      (profile) => useSession.setState({ profile, profileError: false }),
      (error) => {
        console.error('Falha ao ler o perfil.', error);
        useSession.setState({ profileError: true });
      },
    );
  });

  return () => {
    stopProfile?.();
    stopAuth();
  };
}
