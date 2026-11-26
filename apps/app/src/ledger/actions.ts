import {
  MISSION_BONUS,
  dayKey,
  earnsHabitBonus,
  formatDuration,
  formatMoney,
  habitBonusId,
  isExpired,
  isMissionComplete,
  nextCharge,
  usedMinutes,
  type Activity,
  type InventoryItem,
  type Mission,
  type Session,
  type ShopItem,
} from '@tapago/core';
import {
  activitiesRepository,
  missionsRepository,
  shopRepository,
  timerRepository,
  type ActionContext,
} from '@tapago/data';

import { confirm } from '@/platform/confirm';
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

/** A recusa das regras: outro aparelho chegou antes. */
const isDenied = (error: unknown) =>
  String((error as { code?: unknown }).code).endsWith('permission-denied');

/** Bônus já pedidos com o app aberto, antes de o agregado do dia mostrar o pagamento. */
const requestedBonuses = new Set<string>();

/**
 * O pagamento do bônus do hábito, se este registro dá direito a ele (R13), ou `null`.
 * Precisa ser chamado antes de gravar o registro, com o agregado ainda sem ele.
 */
function habitBonusFor(context: ActionContext, activity: Activity): (() => void) | null {
  const { habit } = activity;
  const { dailies } = useLedger.getState();
  if (!habit || !dailies) return null;
  const today = dayKey(context.at, context.timeZone);
  const daily = dailies.find((candidate) => candidate.date === today);
  const id = habitBonusId(activity.id, today);
  const paid = (daily?.bonuses[activity.id] ?? 0) > 0 || requestedBonuses.has(id);
  if (!earnsHabitBonus(activity, (daily?.counts[activity.id] ?? 0) + 1, paid)) return null;

  return () => {
    requestedBonuses.add(id);
    activitiesRepository.payHabitBonus(context, { ...activity, habit }).catch((error: unknown) => {
      // Outro aparelho pode ter pagado antes: a recusa do servidor é esperada.
      if (isDenied(error)) {
        console.warn('O bônus do dia já tinha sido pago.', error);
        return;
      }
      requestedBonuses.delete(id);
      console.error('Falha ao pagar o bônus.', error);
      showToast('Não foi possível salvar o bônus. Ele volta no próximo registro.');
    });
  };
}

/**
 * Escritas da missão já pedidas com o app aberto. Cada uma é tentada uma vez: se o servidor
 * recusar, o cache local volta atrás, e insistir repetiria a recusa sem parar.
 */
const requestedMissions = new Set<string>();

const missionKey = (uid: string, date: string, activities: Mission['activities']) =>
  `${uid}:${date}:${activities.map(({ id }) => id).join(',')}`;

function onMissionRefused(error: unknown) {
  if (isDenied(error)) console.warn('A missão do dia já tinha mudado em outro aparelho.', error);
  else console.error('Falha ao salvar a missão do dia.', error);
}

/** Gravar a missão sorteada. Vale a primeira gravada no dia, de qualquer aparelho. */
export function createMission(uid: string, date: string, activities: Mission['activities']) {
  const key = `criar:${uid}:${date}`;
  if (requestedMissions.has(key)) return;
  requestedMissions.add(key);
  missionsRepository.create(uid, date, activities).catch(onMissionRefused);
}

export function replaceMission(uid: string, mission: Mission, activities: Mission['activities']) {
  const key = `trocar:${missionKey(uid, mission.date, activities)}`;
  if (requestedMissions.has(key)) return;
  requestedMissions.add(key);
  missionsRepository.replace(uid, mission.date, activities).catch(onMissionRefused);
}

/** Pede o pagamento do bônus (R18). `false` se ele já tinha sido pedido. */
function payMission(context: ActionContext, mission: Mission): boolean {
  const key = `pagar:${missionKey(context.uid, mission.date, mission.activities)}`;
  if (requestedMissions.has(key)) return false;
  requestedMissions.add(key);
  missionsRepository.payBonus(context, mission).catch((error: unknown) => {
    onMissionRefused(error);
    if (isDenied(error)) return;
    requestedMissions.delete(key);
    showToast('Não foi possível salvar o bônus da missão.');
  });
  return true;
}

/** A missão cumprida sem um toque agora: registros de antes do sorteio ou de outro aparelho. */
export function payPendingMission(mission: Mission) {
  const context = actionContext();
  // Missão de um dia que já virou expira (R18).
  if (!context || dayKey(context.at, context.timeZone) !== mission.date) return;
  if (!payMission(context, mission)) return;
  const names = mission.activities.map(({ name }) => name).join(' + ');
  showToast(`Missão cumprida! ${names}.`, `+${formatMoney(MISSION_BONUS)}`);
}

/**
 * A missão que este registro cumpre, ou `null`. Como no hábito, precisa ser chamada antes de
 * gravar o registro, com o agregado ainda sem ele.
 */
function missionCompletedBy(context: ActionContext, activity: Activity): Mission | null {
  const { missions, dailies } = useLedger.getState();
  if (!missions || !dailies) return null;
  const today = dayKey(context.at, context.timeZone);
  const mission = missions.missions.find((candidate) => candidate.date === today);
  if (!mission || mission.completedAt) return null;
  if (!mission.activities.some(({ id }) => id === activity.id)) return null;
  const counts = { ...dailies.find((daily) => daily.date === today)?.counts };
  counts[activity.id] = (counts[activity.id] ?? 0) + 1;
  return isMissionComplete(mission, counts) ? mission : null;
}

/** Registrar com 1 toque, sem confirmação (ACT-03). */
export function registerActivity(tapped: Activity) {
  const context = actionContext();
  if (!context) return;
  // A versão mais nova: um segundo toque pode chegar antes de o cartão ser redesenhado.
  const activity =
    useLedger.getState().activities?.find((candidate) => candidate.id === tapped.id) ?? tapped;
  const { value } = nextCharge(activity, dayKey(context.at, context.timeZone));
  const payHabit = habitBonusFor(context, activity);
  const mission = missionCompletedBy(context, activity);
  save(activitiesRepository.register(context, activity));
  // Cada bônus em um lote separado, depois do registro: se for recusado, o registro fica.
  payHabit?.();
  const paidMission = mission !== null && payMission(context, mission);

  const positive = activity.kind === 'positive';
  const habitBonus = payHabit ? (activity.habit?.bonus ?? 0) : 0;
  const bonus = habitBonus + (paidMission ? MISSION_BONUS : 0);
  if (bonus > 0) {
    const title = !paidMission
      ? 'Hábito completo!'
      : habitBonus > 0
        ? 'Hábito e missão do dia completos!'
        : 'Missão cumprida!';
    showToast(
      `${title} ${activity.name}: ${formatMoney(value)} + ${formatMoney(bonus)} de bônus.`,
      `+${formatMoney(value + bonus)}`,
    );
    return;
  }
  showToast(
    `${activity.name} — ${positive ? 'feito.' : 'registrado.'}`,
    `${positive ? '+' : '−'}${formatMoney(value)}`,
  );
}

/** Zerar o custo de uma negativa: só o usuário zera, e com confirmação (R15, SEQ-04). */
export async function resetPenalty(activity: Activity) {
  const uid = useSession.getState().user?.uid;
  if (!uid) return;
  const proceed = await confirm({
    title: `Zerar o custo de "${activity.name}"?`,
    message: `O próximo registro volta a custar ${formatMoney(activity.value)}. O histórico não muda.`,
    confirmLabel: 'Zerar custo',
  });
  if (!proceed) return;
  save(activitiesRepository.resetPenalty(uid, activity.id));
  showToast(`${activity.name} — custo zerado.`);
}

/** Pedido no toque de começar, quando dá para explicar para que serve. */
function askForAlerts() {
  // Com os dois avisos desligados no Perfil, não há o que pedir.
  const notif = useSession.getState().profile?.notif;
  if (notif && !notif.end && !notif.warn5) return;
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
