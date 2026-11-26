import { useEffect } from 'react';

import { syncReminders } from '@/platform/reminders';
import { useSession } from '@/session/store';

/**
 * Ligado uma vez, no layout das abas: agenda o resumo semanal e o lembrete diário conforme as
 * preferências, que valem em todos os aparelhos (NOTIF-04).
 */
export function useReminderController() {
  const ready = useSession((state) => state.profile !== null);
  const weekly = useSession((state) => state.profile?.notif.weekly ?? false);
  const daily = useSession((state) => state.profile?.notif.daily ?? false);
  const dailyHour = useSession((state) => state.profile?.notif.dailyHour ?? 20);

  useEffect(() => {
    if (!ready) return;
    void syncReminders({ weekly, daily, dailyHour });
  }, [ready, weekly, daily, dailyHour]);
}
