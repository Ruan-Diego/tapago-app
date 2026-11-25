import { DUE_TOLERANCE_MS, isExpired, timerAlerts } from '@tapago/core';
import { useEffect, useRef } from 'react';

import { finishExpiredSession } from '@/ledger/actions';
import { useLedger } from '@/ledger/store';
import { showToast } from '@/ledger/toast';
import { deviceTimeZone } from '@/ledger/useToday';
import { syncScheduledAlerts } from '@/platform/notifications';
import { useSession } from '@/session/store';

import { clearInAppAlerts, syncInAppAlerts } from './inAppAlerts';
import { useAppReturn } from './useAppReturn';

/** Quanto esperar o servidor confirmar uma sessão vinda do cache antes de encerrá-la. */
const CACHE_GRACE_MS = 5000;

/**
 * Ligado uma vez, no layout das abas: agenda os avisos a cada mudança da sessão (TMR-02, 03) e
 * encerra a que chegou ao fim.
 */
export function useTimerController() {
  const timer = useLedger((state) => state.timer);
  const profile = useSession((state) => state.profile);
  const returns = useAppReturn();
  /** Cada sessão é encerrada uma vez só: se o servidor recusar, não insiste. */
  const closed = useRef(new Set<string>());

  const ready = timer !== null && profile !== null;
  const session = timer?.session ?? null;
  const fromCache = timer?.fromCache ?? true;
  const warn5 = profile?.notif.warn5 ?? false;
  const end = profile?.notif.end ?? false;
  const timeZone = profile?.timezone ?? deviceTimeZone();

  useEffect(() => {
    if (!ready) return;
    const alerts = timerAlerts(session, { prefs: { end, warn5 }, timeZone, now: new Date() });
    syncInAppAlerts(alerts);
    void syncScheduledAlerts(alerts);
  }, [ready, session, end, warn5, timeZone, returns]);

  useEffect(() => clearInAppAlerts, []);

  useEffect(() => {
    if (!ready || !session || session.status !== 'running') return;
    if (closed.current.has(session.id)) return;
    const wait = Math.max(0, session.endsAt.getTime() - Date.now());
    // Um cache antigo pode não saber que outro aparelho pausou: dá um tempo para o servidor.
    const delay = wait + (fromCache ? CACHE_GRACE_MS : 0);

    const handle = setTimeout(() => {
      const now = new Date();
      if (!isExpired(session, now)) return;
      closed.current.add(session.id);
      finishExpiredSession(session);
      // Terminando agora, o alerta já avisa; o recado é para quem abriu o app depois.
      if (now.getTime() - session.endsAt.getTime() > DUE_TOLERANCE_MS) {
        showToast(`${session.itemName} — tempo esgotado.`);
      }
    }, delay);
    return () => clearTimeout(handle);
  }, [ready, session, fromCache, returns]);
}
