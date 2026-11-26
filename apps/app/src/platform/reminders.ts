/**
 * Android: resumo semanal (NOTIF-04) e lembrete diário, como notificações locais que se repetem.
 * Sem servidor (plano Spark): cada celular agenda as próprias, a partir das preferências do Perfil.
 */
import type { UserProfile } from '@tapago/core';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';

const CHANNEL_ID = 'reminders';
const WEEKLY_ID = 'tapago-weekly';
const DAILY_ID = 'tapago-daily';

/** Domingo, no `weekday` do expo-notifications (1 = domingo). */
const SUNDAY = 1;
const WEEKLY_HOUR = 20;

/** Os lembretes chegam neste aparelho. */
export const REMINDERS_HERE = true;

export type ReminderPrefs = Pick<UserProfile['notif'], 'weekly' | 'daily' | 'dailyHour'>;

async function ensureChannel() {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Resumo e lembretes',
    importance: AndroidImportance.DEFAULT,
  });
}

async function sync({ weekly, daily, dailyHour }: ReminderPrefs) {
  await ensureChannel();
  // Refaz do zero: a hora pode ter mudado. Os avisos do timer têm outros ids e ficam.
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID);
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID);
  if (weekly) {
    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_ID,
      content: {
        title: 'Seu resumo da semana',
        body: 'Veja quanto ganhou, perdeu, o lazer e a sequência desta semana.',
        data: { url: '/history' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: SUNDAY,
        hour: WEEKLY_HOUR,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    });
  }
  if (daily) {
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: {
        title: 'Já registrou o dia?',
        body: 'Um toque no que você fez e tá pago.',
        data: { url: '/' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: dailyHour,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    });
  }
}

let queue: Promise<void> = Promise.resolve();

/** Uma sincronização por vez, na ordem das mudanças. */
export function syncReminders(prefs: ReminderPrefs): Promise<void> {
  queue = queue
    .then(() => sync(prefs))
    .catch((error: unknown) => {
      console.warn('Não foi possível agendar os lembretes.', error);
    });
  return queue;
}
