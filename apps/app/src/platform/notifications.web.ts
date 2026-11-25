/** Web: sem servidor, o aviso só existe com a aba aberta (NOTIF-03). */
import type { TimerAlert } from '@tapago/core';

import type { AlertPermission } from './alertPermission';

export const ALERT_NOTICE: string | null = 'O aviso só aparece com esta aba aberta.';
export const BLOCKED_HINT: string =
  'As notificações estão bloqueadas neste navegador. O alerta aparece só dentro da página.';

const supported = () => typeof window !== 'undefined' && 'Notification' in window;

export async function getAlertPermission(): Promise<AlertPermission> {
  return supported() ? Notification.permission : 'denied';
}

/** Chamar a partir de um toque: alguns navegadores ignoram o pedido fora dele. */
export async function requestAlertPermission(): Promise<AlertPermission> {
  if (!supported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/** Na web não há notificação agendada. */
export async function syncScheduledAlerts(_alerts: readonly TimerAlert[]): Promise<void> {}

export function notifyNow({ id, title, body }: TimerAlert): void {
  if (!supported() || Notification.permission !== 'granted') return;
  try {
    // A `tag` evita repetir o mesmo aviso quando há mais de uma aba aberta.
    new Notification(title, { body, tag: id });
  } catch (error) {
    // O Chrome do Android só notifica por service worker.
    console.warn('O navegador não mostrou a notificação.', error);
  }
}

export async function cancelScheduledNotifications(): Promise<void> {}
