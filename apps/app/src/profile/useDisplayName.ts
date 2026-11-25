import { useSession } from '@/session/store';

/** Nome do perfil; sem ele, o da conta ou o começo do e-mail. */
export function useDisplayName(): string {
  return useSession(
    ({ profile, user }) =>
      profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Você',
  );
}
