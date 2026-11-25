import { dayKey } from '@tapago/core';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/session/store';

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** O dia de hoje no fuso do usuário; vira à meia-noite mesmo com o app aberto. */
export function useToday(): string {
  const timeZone = useSession((state) => state.profile?.timezone) ?? deviceTimeZone();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 30_000);
    // Em segundo plano os timers param: confere de novo na volta.
    const subscription = AppState.addEventListener('change', refresh);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return dayKey(now, timeZone);
}
