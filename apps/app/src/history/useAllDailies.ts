import { mergeDailies, type Daily } from '@tapago/core';
import { useEffect, useMemo } from 'react';

import { loadAllDailies, useLedger } from '@/ledger/store';
import { useSession } from '@/session/store';

/**
 * Os agregados de toda a conta, para totais e recorde: o que está ao vivo por cima de uma leitura
 * única do resto. `null` enquanto os recentes não chegam.
 */
export function useAllDailies(): Daily[] | null {
  const uid = useSession((state) => state.user?.uid);
  const live = useLedger((state) => state.dailies);
  const all = useLedger((state) => state.allDailies);

  useEffect(() => {
    if (uid) loadAllDailies(uid);
  }, [uid]);

  return useMemo(() => (live === null ? null : mergeDailies(all ?? [], live)), [all, live]);
}
