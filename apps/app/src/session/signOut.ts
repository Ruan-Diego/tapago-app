import { authRepository } from '@tapago/data';

import { clearAndroidSurfaces } from '@/platform/androidSurfaces';
import { confirm } from '@/platform/confirm';
import { cancelScheduledNotifications } from '@/platform/notifications';

/** Sair: cancela as notificações do aparelho e limpa o cache local (AUTH-05). */
export async function signOut(): Promise<void> {
  if (await authRepository.hasPendingWrites(3000)) {
    const proceed = await confirm({
      title: 'Há dados não enviados',
      message:
        'Algumas mudanças ainda não chegaram ao servidor. Se sair agora, elas serão perdidas.',
      confirmLabel: 'Sair mesmo assim',
    });
    if (!proceed) return;
  }
  await cancelScheduledNotifications();
  clearAndroidSurfaces();
  await authRepository.signOut();
}
