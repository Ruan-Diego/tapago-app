import * as Notifications from 'expo-notifications';

/** Os avisos do timer (F2) são locais; ao sair, nenhum pode sobrar no aparelho. */
export async function cancelScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
