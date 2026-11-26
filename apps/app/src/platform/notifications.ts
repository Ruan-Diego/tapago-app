/** Android: os avisos do timer são notificações locais agendadas no próprio aparelho. */
import { alertChanges, type TimerAlert } from '@tapago/core';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

import type { AlertPermission } from './alertPermission';

const CHANNEL_ID = 'timer';

/** Aviso mostrado junto do timer quando os alertas têm alguma limitação nesta plataforma. */
export const ALERT_NOTICE: string | null = null;
export const BLOCKED_HINT =
  'As notificações estão desligadas. Ative nos ajustes do Android para ser avisado.';

// Com o app aberto, quem avisa é o alerta dentro do app: aqui só o som e a lista do sistema.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** No Android 13+ o pedido de permissão só aparece depois de existir um canal. */
async function ensureChannel() {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Timer do lazer',
    importance: AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
  });
}

function toPermission(status: Notifications.NotificationPermissionsStatus): AlertPermission {
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'default' : 'denied';
}

export async function getAlertPermission(): Promise<AlertPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestAlertPermission(): Promise<AlertPermission> {
  await ensureChannel();
  const current = await getAlertPermission();
  if (current !== 'default') return current;
  return toPermission(await Notifications.requestPermissionsAsync());
}

async function sync(alerts: readonly TimerAlert[]) {
  await ensureChannel();
  if (alerts.length > 0) await requestAlertPermission();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const changes = alertChanges(
    alerts,
    scheduled.map((request) => request.identifier),
    new Date(),
  );
  for (const id of changes.cancel) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
  for (const alert of changes.schedule) {
    // O pedido de permissão pode demorar: o horário pode ter passado.
    if (alert.at.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: alert.id,
      content: {
        title: alert.title,
        body: alert.body,
        sound: 'default',
        data: { url: '/inventory' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alert.at,
        channelId: CHANNEL_ID,
        // Alarme que a economia de bateria não adia; sem a permissão, vira agendamento comum.
        delivery: 'alarmClock',
      },
    });
  }
}

/** Uma sincronização de cada vez, na ordem em que as mudanças da sessão chegaram. */
let queue: Promise<void> = Promise.resolve();

export function syncScheduledAlerts(alerts: readonly TimerAlert[]): Promise<void> {
  queue = queue
    .then(() => sync(alerts))
    .catch((error: unknown) => {
      console.warn('Não foi possível agendar os avisos.', error);
    });
  return queue;
}

/** O agendamento do sistema já cobre o aviso na hora. */
export function notifyNow(_alert: TimerAlert): void {}

/** Ao sair, nenhum aviso pode sobrar no aparelho. */
export function cancelScheduledNotifications(): Promise<void> {
  queue = queue
    .then(() => Notifications.cancelAllScheduledNotificationsAsync())
    .catch((error: unknown) => {
      console.warn('Não foi possível cancelar os avisos.', error);
    });
  return queue;
}
