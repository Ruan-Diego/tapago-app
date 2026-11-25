import { addDays, type Activity, type Daily, type ShopItem } from '@tapago/core';
import { activitiesRepository, dailyRepository, shopRepository } from '@tapago/data';
import { useEffect } from 'react';
import { create } from 'zustand';

/** Período dos cartões do Histórico. O filtro de 7/30/90 dias é da F3. */
export const PERIOD_DAYS = 30;

interface LedgerState {
  /** `null` enquanto carrega. */
  activities: Activity[] | null;
  shopItems: ShopItem[] | null;
  /** Agregados do período atual e do anterior. */
  dailies: Daily[] | null;
  error: boolean;
}

const EMPTY: LedgerState = { activities: null, shopItems: null, dailies: null, error: false };

export const useLedger = create<LedgerState>(() => EMPTY);

function fail(error: Error) {
  console.error('Falha ao ler os dados.', error);
  useLedger.setState({ error: true });
}

/**
 * Listeners compartilhados pelas abas, um por coleção e por conta, para não gastar leituras da
 * cota do Spark. Os agregados são religados só quando o dia vira.
 */
export function useLedgerSubscription(uid: string | undefined, today: string) {
  useEffect(() => {
    if (!uid) return;
    const stopActivities = activitiesRepository.watch(
      uid,
      (activities) => useLedger.setState({ activities }),
      fail,
    );
    const stopShop = shopRepository.watch(
      uid,
      (shopItems) => useLedger.setState({ shopItems }),
      fail,
    );
    return () => {
      stopActivities();
      stopShop();
      useLedger.setState(EMPTY);
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return dailyRepository.watchSince(
      uid,
      addDays(today, 1 - 2 * PERIOD_DAYS),
      (dailies) => useLedger.setState({ dailies }),
      fail,
    );
  }, [uid, today]);
}
