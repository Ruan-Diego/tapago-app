/**
 * Avisos enquanto o app ou a aba estão abertos: o alerta na tela e, na web, a notificação do
 * navegador.
 */
import { alertChanges, isAlertStale, type TimerAlert } from '@tapago/core';

import { notifyNow } from '@/platform/notifications';

import { useAlertBanner } from './store';

interface Pending {
  alert: TimerAlert;
  handle: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, Pending>();

function fire(alert: TimerAlert) {
  pending.delete(alert.id);
  if (isAlertStale(alert, new Date())) return;
  useAlertBanner.setState({ alert });
  notifyNow(alert);
}

function arm(alert: TimerAlert) {
  clearTimeout(pending.get(alert.id)?.handle);
  const delay = Math.max(0, alert.at.getTime() - Date.now());
  pending.set(alert.id, { alert, handle: setTimeout(() => fire(alert), delay) });
}

function drop(id: string) {
  clearTimeout(pending.get(id)?.handle);
  pending.delete(id);
}

/**
 * Deixa os avisos pendentes iguais aos desejados e refaz a contagem de todos: o navegador atrasa
 * os temporizadores de abas em segundo plano.
 */
export function syncInAppAlerts(alerts: readonly TimerAlert[]) {
  const changes = alertChanges(alerts, [...pending.keys()], new Date());
  changes.cancel.forEach(drop);
  for (const { alert } of [...pending.values()]) arm(alert);
  changes.schedule.forEach(arm);
}

export function clearInAppAlerts() {
  [...pending.keys()].forEach(drop);
  useAlertBanner.setState({ alert: null });
}
