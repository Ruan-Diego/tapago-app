import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { AlertPermission } from './alertPermission';
import { getAlertPermission, requestAlertPermission } from './notifications';

/** Permissão de notificação, conferida de novo quando o usuário volta ao app. */
export function useAlertPermission() {
  const [permission, setPermission] = useState<AlertPermission | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      void getAlertPermission().then((value) => {
        if (active) setPermission(value);
      });
    refresh();
    const subscription = AppState.addEventListener('change', refresh);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  async function request() {
    setPermission(await requestAlertPermission());
  }

  return { permission, request };
}
