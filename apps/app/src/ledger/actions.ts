import { formatMoney, type Activity, type ShopItem } from '@tapago/core';
import { activitiesRepository, shopRepository, type ActionContext } from '@tapago/data';

import { deviceId } from '@/platform/deviceId';
import { useSession } from '@/session/store';

import { showToast } from './toast';

function actionContext(): ActionContext | null {
  const { user, profile } = useSession.getState();
  if (!user || !profile) return null;
  return { uid: user.uid, at: new Date(), deviceId: deviceId(), timeZone: profile.timezone };
}

/**
 * A tela não espera a escrita: o cache local atualiza na hora, também sem internet. Só uma
 * recusa do servidor aparece depois, e o Firestore desfaz a mudança sozinho.
 */
export function save(write: Promise<void>) {
  write.catch((error: unknown) => {
    console.error('Falha ao salvar.', error);
    showToast('Não foi possível salvar. A mudança foi desfeita.');
  });
}

/** Registrar com 1 toque, sem confirmação (ACT-03). */
export function registerActivity(activity: Activity) {
  const context = actionContext();
  if (!context) return;
  save(activitiesRepository.register(context, activity));
  const positive = activity.kind === 'positive';
  showToast(
    `${activity.name} — ${positive ? 'feito.' : 'registrado.'}`,
    `${positive ? '+' : '−'}${formatMoney(activity.value)}`,
  );
}

/** Compra direta: vai para o inventário (o modal "usar agora / guardar" é a F2). */
export function buyItem(item: ShopItem) {
  const context = actionContext();
  const balance = useSession.getState().profile?.balance;
  if (!context || balance === undefined || balance < item.value) return;
  save(shopRepository.buy(context, item, balance));
  showToast(`${item.name} — guardado no inventário.`, `−${formatMoney(item.value)}`);
}
