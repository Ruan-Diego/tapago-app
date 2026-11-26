import {
  HISTORY_WINDOW_DAYS,
  addDays,
  type Activity,
  type Daily,
  type InventoryItem,
  type ShopItem,
} from '@tapago/core';
import {
  activitiesRepository,
  dailyRepository,
  inventoryRepository,
  shopRepository,
  timerRepository,
  type TimerSnapshot,
} from '@tapago/data';
import { useEffect } from 'react';
import { create } from 'zustand';

interface LedgerState {
  /** `null` enquanto carrega. */
  activities: Activity[] | null;
  shopItems: ShopItem[] | null;
  inventory: InventoryItem[] | null;
  timer: TimerSnapshot | null;
  /** Agregados do maior período do Histórico e do anterior a ele. */
  dailies: Daily[] | null;
  /** Todos os agregados, lidos uma vez quando o Histórico ou o Perfil abre. */
  allDailies: Daily[] | null;
  error: boolean;
}

const EMPTY: LedgerState = {
  activities: null,
  shopItems: null,
  inventory: null,
  timer: null,
  dailies: null,
  allDailies: null,
  error: false,
};

export const useLedger = create<LedgerState>(() => EMPTY);

function fail(error: Error) {
  console.error('Falha ao ler os dados.', error);
  useLedger.setState({ error: true });
}

/** A conta dos listeners ligados: uma resposta atrasada de outra conta é descartada. */
let currentUid: string | null = null;
let loadingAllFor: string | null = null;

/** Lê uma vez por sessão os agregados antigos. Se falhar, a próxima abertura tenta de novo. */
export function loadAllDailies(uid: string) {
  if (loadingAllFor === uid || useLedger.getState().allDailies !== null) return;
  loadingAllFor = uid;
  dailyRepository
    .getAll(uid)
    .then((allDailies) => {
      if (currentUid === uid) useLedger.setState({ allDailies });
    })
    .catch((error: unknown) => console.warn('Falha ao ler todo o histórico.', error))
    .finally(() => {
      if (loadingAllFor === uid) loadingAllFor = null;
    });
}

/**
 * Listeners compartilhados pelas abas, um por coleção e por conta, para não gastar leituras da
 * cota do Spark. Os agregados são religados só quando o dia vira.
 */
export function useLedgerSubscription(uid: string | undefined, today: string) {
  useEffect(() => {
    if (!uid) return;
    currentUid = uid;
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
    const stopInventory = inventoryRepository.watch(
      uid,
      (inventory) => useLedger.setState({ inventory }),
      fail,
    );
    const stopTimer = timerRepository.watch(uid, (timer) => useLedger.setState({ timer }), fail);
    return () => {
      stopActivities();
      stopShop();
      stopInventory();
      stopTimer();
      currentUid = null;
      useLedger.setState(EMPTY);
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return dailyRepository.watchSince(
      uid,
      addDays(today, 1 - HISTORY_WINDOW_DAYS),
      (dailies) => useLedger.setState({ dailies }),
      fail,
    );
  }, [uid, today]);
}
