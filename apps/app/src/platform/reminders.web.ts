/** Web: sem notificação agendada; o resumo semanal e o lembrete chegam só no Android. */
import type { UserProfile } from '@tapago/core';

export const REMINDERS_HERE = false;

export type ReminderPrefs = Pick<UserProfile['notif'], 'weekly' | 'daily' | 'dailyHour'>;

export function syncReminders(_prefs: ReminderPrefs): Promise<void> {
  return Promise.resolve();
}
