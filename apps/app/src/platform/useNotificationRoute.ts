import { router, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

/**
 * Android: tocar numa notificação abre a tela dela (o resumo semanal abre o Histórico; o timer, o
 * Inventário). Cada toque é seguido uma vez.
 */
export function useNotificationRoute() {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (handled.current === key) return;
    handled.current = key;
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.navigate(url as Href);
  }, [response]);
}
