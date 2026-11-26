import { addDays, nextMissionStep } from '@tapago/core';
import { useEffect } from 'react';

import { createMission, payPendingMission, replaceMission } from '@/ledger/actions';
import { useLedger } from '@/ledger/store';
import { useToday } from '@/ledger/useToday';
import { useSession } from '@/session/store';

/** Quanto esperar o servidor dizer que já há missão antes de sortear a partir do cache. */
const CACHE_GRACE_MS = 5000;

/**
 * Ligado uma vez, no layout das abas: cria a missão ao abrir o app ou na virada do dia, troca a
 * atividade arquivada e paga o bônus que ainda não saiu (registros anteriores ao sorteio, ou
 * feitos em outro aparelho).
 */
export function useMissionController() {
  const uid = useSession((state) => state.user?.uid);
  const today = useToday();
  const snapshot = useLedger((state) => state.missions);
  const activities = useLedger((state) => state.activities);
  const dailies = useLedger((state) => state.dailies);

  useEffect(() => {
    if (!uid || !snapshot || !activities || !dailies) return;
    // Na virada do dia, a leitura antiga não serve para saber se a de hoje já existe.
    if (snapshot.since !== addDays(today, -1)) return;
    const step = nextMissionStep({
      uid,
      today,
      missions: snapshot.missions,
      activities,
      counts: dailies.find((daily) => daily.date === today)?.counts ?? {},
    });
    if (!step) return;

    if (step.type === 'pay') payPendingMission(step.mission);
    else if (step.type === 'replace') replaceMission(uid, step.mission, step.activities);
    else {
      const delay = snapshot.fromCache ? CACHE_GRACE_MS : 0;
      const handle = setTimeout(() => createMission(uid, today, step.activities), delay);
      return () => clearTimeout(handle);
    }
  }, [uid, today, snapshot, activities, dailies]);
}
