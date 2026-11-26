import { missionSchema, type Mission } from '@tapago/core';

import { backend } from './backend';
import { commitEntry, type WrittenEntry } from './commitEntry';
import { parseDocs } from './parse';
import type { Unsubscribe } from './types';
import {
  createMissionOp,
  missionBonusOps,
  paths,
  replaceMissionOp,
  type ActionContext,
} from './writes';

export interface MissionsSnapshot {
  missions: Mission[];
  /** `true` enquanto o servidor ainda não confirmou o que veio do cache local. */
  fromCache: boolean;
}

export const missionsRepository = {
  /** As missões a partir do dia `from`: no app, a de ontem e a de hoje. */
  watchSince(
    uid: string,
    from: string,
    onChange: (snapshot: MissionsSnapshot) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return backend.watchQuery(
      { path: paths.missions(uid), orderBy: { field: 'date', direction: 'asc' }, from },
      ({ docs, fromCache }) => onChange({ missions: parseDocs(missionSchema, docs), fromCache }),
      onError,
    );
  },

  /** Gravar a missão do dia. O servidor recusa se outro aparelho já gravou. */
  create(uid: string, date: string, activities: Mission['activities']): Promise<void> {
    return backend.commit([createMissionOp(uid, date, activities, new Date())]);
  },

  replace(uid: string, date: string, activities: Mission['activities']): Promise<void> {
    return backend.commit([replaceMissionOp(uid, date, activities)]);
  },

  /** Pagar o bônus da missão. O servidor recusa se o dia já foi pago (R18). */
  payBonus(context: ActionContext, mission: Mission): WrittenEntry {
    return commitEntry(missionBonusOps(context, mission));
  },
};
