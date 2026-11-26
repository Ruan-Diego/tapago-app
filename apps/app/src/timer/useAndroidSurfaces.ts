import { formatDuration, formatMoney, remainingMs } from '@tapago/core';
import { useEffect } from 'react';

import { useLedger } from '@/ledger/store';
import { useToday } from '@/ledger/useToday';
import { showTimerNotification, updateWidget, type TimerSurface } from '@/platform/androidSurfaces';
import { useSession } from '@/session/store';

/** "faltam 12 min" ou "falta menos de 1 min". */
function pausedText(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  return minutes >= 1 ? `faltam ${formatDuration(minutes)}` : 'falta menos de 1 min';
}

/**
 * Ligado uma vez, no layout das abas: mantém o timer na notificação fixa (NOTIF-05) e o widget
 * da tela inicial iguais ao app. Os dois contam sozinhos pelo horário de fim, sem o app aberto.
 */
export function useAndroidSurfaces() {
  const session = useLedger((state) => state.timer?.session ?? null);
  const balance = useSession((state) => state.profile?.balance ?? null);
  const today = useToday();
  const daily = useLedger((state) => state.dailies?.find((item) => item.date === today) ?? null);

  const timer: TimerSurface | null = session
    ? {
        title: session.itemName,
        endsAt: session.endsAt.getTime(),
        paused: session.status === 'paused',
        // Só a pausada usa o texto; na que roda, a contagem é do sistema.
        pausedText: session.status === 'paused' ? pausedText(remainingMs(session, new Date())) : '',
      }
    : null;
  // Uma chave estável: o efeito só roda quando algo visível muda.
  const timerKey = timer
    ? `${timer.title}|${timer.endsAt}|${timer.paused}|${timer.pausedText}`
    : '';

  useEffect(() => {
    showTimerNotification(timer);
    // `timer` é recalculado a cada render; a chave resume o que importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey]);

  const earned = daily?.earned ?? 0;
  const lost = daily?.lost ?? 0;
  const count = daily?.posCount ?? 0;

  useEffect(() => {
    if (balance === null) return;
    const net = earned - lost;
    updateWidget({
      signedIn: true,
      balance: formatMoney(balance),
      today: `Hoje ${net >= 0 ? '+' : '−'}${formatMoney(Math.abs(net))} · ${count === 1 ? '1 feita' : `${count} feitas`}`,
      timer,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance, earned, lost, count, timerKey]);
}
