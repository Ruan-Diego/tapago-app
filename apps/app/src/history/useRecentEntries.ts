import type { Entry } from '@tapago/core';
import { entriesRepository, type EntryPage } from '@tapago/data';
import { useEffect, useState } from 'react';

const PAGE_SIZE = 20;

interface State {
  /** Todos os já vistos, por id: um lançamento novo não empurra os antigos para fora. */
  byId: ReadonlyMap<string, Entry>;
  loaded: boolean;
  /** `null` até carregar a primeira página antiga; antes disso vale a página ao vivo. */
  olderHasMore: boolean | null;
  liveHasMore: boolean;
}

const INITIAL: State = { byId: new Map(), loaded: false, olderHasMore: null, liveHasMore: false };

function merge(current: ReadonlyMap<string, Entry>, page: EntryPage) {
  const next = new Map(current);
  for (const entry of page.entries) next.set(entry.id, entry);
  return next;
}

/** Atividade recente: a primeira página em tempo real e as anteriores sob pedido (HIST-08). */
export function useRecentEntries(uid: string | undefined) {
  const [state, setState] = useState(INITIAL);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return entriesRepository.watchRecent(
      uid,
      PAGE_SIZE,
      (page) =>
        setState((current) => ({
          ...current,
          byId: merge(current.byId, page),
          loaded: true,
          liveHasMore: page.hasMore,
        })),
      (error) => {
        console.error('Falha ao ler os lançamentos.', error);
        setFailed(true);
      },
    );
  }, [uid]);

  const entries = [...state.byId.values()].sort((a, b) => b.at.getTime() - a.at.getTime());

  async function loadMore() {
    const oldest = entries[entries.length - 1];
    if (!uid || !oldest || loadingMore) return;
    setLoadingMore(true);
    setFailed(false);
    try {
      const page = await entriesRepository.getOlder(uid, oldest.at, PAGE_SIZE);
      setState((current) => ({
        ...current,
        byId: merge(current.byId, page),
        olderHasMore: page.hasMore,
      }));
    } catch (error) {
      console.error('Falha ao carregar mais lançamentos.', error);
      setFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    entries,
    loaded: state.loaded,
    hasMore: state.olderHasMore ?? state.liveHasMore,
    loadingMore,
    failed,
    loadMore,
  };
}
