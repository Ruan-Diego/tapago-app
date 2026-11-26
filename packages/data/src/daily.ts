import { dailySchema, type Daily } from '@tapago/core';

import { backend } from './backend';
import type { QueryResult } from './documents';
import type { Unsubscribe } from './types';
import { paths } from './writes';

function parseDailies(docs: QueryResult['docs']): Daily[] {
  return docs.flatMap(({ data }) => {
    const parsed = dailySchema.safeParse(data);
    return parsed.success ? [parsed.data] : [];
  });
}

export const dailyRepository = {
  /** Todos os agregados, lidos uma vez: totais e recorde de toda a conta. */
  async getAll(uid: string): Promise<Daily[]> {
    const { docs } = await backend.getQuery({
      path: paths.daily(uid),
      orderBy: { field: 'date', direction: 'asc' },
    });
    return parseDailies(docs);
  },

  /** Agregados a partir do dia `from` (inclusive): um documento por dia com movimento. */
  watchSince(
    uid: string,
    from: string,
    onChange: (dailies: Daily[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return backend.watchQuery(
      { path: paths.daily(uid), orderBy: { field: 'date', direction: 'asc' }, from },
      ({ docs }) => onChange(parseDailies(docs)),
      onError,
    );
  },
};
