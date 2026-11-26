import {
  activitySchema,
  type Activity,
  type ActivityValues,
  type Entry,
  type Habit,
  type OrderChange,
  type UndoPlan,
} from '@tapago/core';

import { backend } from './backend';
import { commitEntry, type WrittenEntry } from './commitEntry';
import { parseDocs } from './parse';
import type { Unsubscribe } from './types';
import {
  archiveOp,
  createActivityOp,
  habitBonusOps,
  paths,
  registerActivityOps,
  reorderOps,
  resetPenaltyOp,
  undoBonusOps,
  undoRegistrationOps,
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

  /** Registrar com 1 toque (ACT-03). Devolve também o lançamento, para o desfazer. */
  register(context: ActionContext, activity: Activity): WrittenEntry {
    const entryId = backend.newId(paths.entries(context.uid));
    return commitEntry(registerActivityOps(context, activity, entryId));
  },

  /** Pagar o bônus do hábito. O servidor recusa se o dia já foi pago (R13). */
  payHabitBonus(
    context: ActionContext,
    activity: Activity & { habit: Habit },
    reversals: number,
  ): WrittenEntry {
    return commitEntry(habitBonusOps(context, activity, reversals));
  },

  /** Desfazer um registro (R8). */
  undo(context: ActionContext, entry: Entry, plan: UndoPlan): Promise<void> {
    return backend.commit(undoRegistrationOps(context, entry, plan));
  },

  /** Estornar um bônus que deixou de valer. */
  undoBonus(context: ActionContext, bonus: Entry): Promise<void> {
    return backend.commit(undoBonusOps(context, bonus));
  },

  /** Nova ordem das atividades movidas, igual em todos os aparelhos (ACT-06). */
  reorder(uid: string, changes: readonly OrderChange[]): Promise<void> {
    return backend.commit(reorderOps(uid, changes));
  },

  /** Zerar o custo de uma negativa (SEQ-04). */
  resetPenalty(uid: string, id: string): Promise<void> {
    return backend.commit([resetPenaltyOp(uid, id)]);
  },
};
