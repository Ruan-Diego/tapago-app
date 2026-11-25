import {
  formatDuration,
  formatMoney,
  isExpired,
  usedMinutes,
  type Activity,
  type InventoryItem,
  type Session,
  type ShopItem,
} from '@tapago/core';
import {
  activitiesRepository,
  shopRepository,
  timerRepository,
  type ActionContext,
} from '@tapago/data';

import { deviceId } from '@/platform/deviceId';
import { requestAlertPermission } from '@/platform/notifications';
import { useSession } from '@/session/store';
import { buildReceipt, type Receipt } from '@/shop/receipt';

import { useLedger } from './store';
import { showToast } from './toast';

/** Um toque duplo em "Começar" não pode disparar duas escritas antes de a tela atualizar. */
const START_COOLDOWN_MS = 1000;
let lastStart = 0;

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

/** Pedido no toque de começar, quando dá para explicar para que serve. */
function askForAlerts() {
  requestAlertPermission().catch((error: unknown) => {
    console.warn('Não foi possível pedir a permissão de notificação.', error);
  });
}

/** Comprar e usar agora ou guardar (R4). Devolve o recibo, ou `null` se nada foi comprado. */
export function buyItem(item: ShopItem, useNow: boolean): Receipt | null {
  const context = actionContext();
  const balance = useSession.getState().profile?.balance;
  if (!context || balance === undefined || balance < item.value) return null;
  // Um timer por vez (R5).
  const { timer } = useLedger.getState();
  if (useNow && (!timer || timer.session)) return null;

  if (useNow) askForAlerts();
  const { entryId, write } = useNow
    ? shopRepository.buyAndUse(context, item, balance)
    : shopRepository.buyAndKeep(context, item, balance);
  save(write);
  return buildReceipt({
    entryId,
    item,
    balance,
    at: context.at,
    timeZone: context.timeZone,
    useNow,
  });
}

/** Começar um item guardado (INV-02). */
export function startFromInventory(item: InventoryItem) {
  const context = actionContext();
  const { timer } = useLedger.getState();
  if (!context || !timer || timer.session) return;
  if (context.at.getTime() - lastStart < START_COOLDOWN_MS) return;
  lastStart = context.at.getTime();
  askForAlerts();
  save(timerRepository.startStored(context, item));
}

/** A sessão atual e o contexto da ação, ou `null` se não houver timer. */
function currentTimer() {
  const context = actionContext();
  const session = useLedger.getState().timer?.session;
  return context && session ? { context, session } : null;
}

export function pauseTimer() {
  const current = currentTimer();
  if (!current || current.session.status !== 'running') return;
  const { context, session } = current;
  // No último instante, o que vale é o fim.
  if (isExpired(session, context.at)) return;
  save(timerRepository.pause(context.uid, session, context.at));
}

export function resumeTimer() {
  const current = currentTimer();
  if (!current || current.session.status !== 'paused') return;
  save(timerRepository.resume(current.context.uid, current.session, current.context.at));
}

/** Encerrar antes: registra o tempo usado, sem reembolso (TMR-03, R6). */
export function endTimer() {
  const current = currentTimer();
  if (!current) return;
  const { context, session } = current;
  save(timerRepository.finish(context, session));
  showToast(`${session.itemName} — encerrado.`, formatDuration(usedMinutes(session, context.at)));
}

/**
 * Fecha a sessão que chegou ao fim, com a duração completa. Outro aparelho pode ter fechado
 * antes: a recusa do servidor é esperada e não vira erro na tela.
 */
export function finishExpiredSession(session: Session) {
  const context = actionContext();
  if (!context) return;
  timerRepository.finish(context, session).catch((error: unknown) => {
    console.warn('A sessão já tinha sido encerrada.', error);
  });
}
