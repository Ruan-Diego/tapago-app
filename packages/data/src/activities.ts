import { activitySchema, type Activity, type ActivityValues } from '@tapago/core';

import { backend } from './backend';
import { parseDocs } from './parse';
import type { Unsubscribe } from './types';
import {
  archiveOp,
  createActivityOp,
  paths,
  registerActivityOps,
  updateActivityOp,
  type ActionContext,
} from './writes';

/**
 * As escritas são otimistas: os listeners mostram o resultado na hora, e a promessa só resolve
 * quando o servidor confirma (sem internet, ela espera). Não use `await` para liberar a tela.
 */
export const activitiesRepository = {
  watch(
    uid: string,
    onChange: (activities: Activity[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return backend.watchQuery(
      { path: paths.activities(uid), orderBy: { field: 'order', direction: 'asc' } },
      ({ docs }) => onChange(parseDocs(activitySchema, docs)),
      onError,
    );
  },

  create(uid: string, values: ActivityValues): Promise<void> {
    const id = backend.newId(paths.activities(uid));
    return backend.commit([createActivityOp(uid, id, values, new Date())]);
  },

  update(uid: string, id: string, values: ActivityValues): Promise<void> {
    return backend.commit([updateActivityOp(uid, id, values)]);
  },

  archive(uid: string, id: string): Promise<void> {
    return backend.commit([archiveOp(paths.activities(uid), id)]);
  },

  /** Registrar com 1 toque (ACT-03). */
  register(context: ActionContext, activity: Activity): Promise<void> {
    const entryId = backend.newId(paths.entries(context.uid));
    return backend.commit(registerActivityOps(context, activity, entryId));
  },
};
