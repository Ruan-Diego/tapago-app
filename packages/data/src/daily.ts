import { dailySchema, type Daily } from '@tapago/core';

import { backend } from './backend';
import type { Unsubscribe } from './types';
import { paths } from './writes';

export const dailyRepository = {
  /** Agregados a partir do dia `from` (inclusive): um documento por dia com movimento. */
  watchSince(
    uid: string,
    from: string,
    onChange: (dailies: Daily[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return backend.watchQuery(
      { path: paths.daily(uid), orderBy: { field: 'date', direction: 'asc' }, from },
      ({ docs }) =>
        onChange(
          docs.flatMap(({ data }) => {
            const parsed = dailySchema.safeParse(data);
            return parsed.success ? [parsed.data] : [];
          }),
        ),
      onError,
    );
  },
};
