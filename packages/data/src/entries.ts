import { entrySchema, type Entry } from '@tapago/core';

import { backend } from './backend';
import type { QueryResult, QuerySpec } from './documents';
import { parseDocs } from './parse';
import type { Unsubscribe } from './types';
import { paths } from './writes';

export interface EntryPage {
  entries: Entry[];
  /** `false` quando o servidor confirmou que não há lançamentos mais antigos. */
  hasMore: boolean;
}

function newestFirst(uid: string, limit: number, after?: Date): QuerySpec {
  return {
    path: paths.entries(uid),
    orderBy: { field: 'at', direction: 'desc' },
    limit,
    after,
  };
}

function toPage({ docs, fromCache }: QueryResult, limit: number): EntryPage {
  return {
    entries: parseDocs(entrySchema, docs),
    // Sem internet, uma página incompleta pode ser só o que há no cache.
    hasMore: docs.length === limit || fromCache,
  };
}

/** Lançamentos sempre paginados, por causa da cota de leituras do Spark. */
export const entriesRepository = {
  /** A primeira página, em tempo real. */
  watchRecent(
    uid: string,
    limit: number,
    onChange: (page: EntryPage) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return backend.watchQuery(
      newestFirst(uid, limit),
      (result) => onChange(toPage(result, limit)),
      onError,
    );
  },

  /** Lançamentos anteriores a `before`, lidos uma vez. */
  async getOlder(uid: string, before: Date, limit: number): Promise<EntryPage> {
    return toPage(await backend.getQuery(newestFirst(uid, limit, before)), limit);
  },
};
