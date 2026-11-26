/** Desfazer um registro (R8): o que estornar e o que voltar atrás. */
import { dayKey } from './days';
import { habitBonusId } from './habits';
import {
  habitBonusEntry,
  missionBonusEntry,
  type Activity,
  type Daily,
  type Entry,
  type Mission,
  type Streak,
} from './ledger';
import { missionBonusId } from './missions';

/** Por quanto tempo um registro pode ser desfeito (ACT-05). */
export const UNDO_WINDOW_MS = 10_000;

/** O que o app guarda de um registro enquanto ele pode ser desfeito. */
export interface Registration {
  /** O lançamento `earn` ou `loss` criado. */
  entry: Entry;
  /** A sequência da positiva antes do registro; ausente se não havia. */
  previousStreak?: Streak;
  /** Os bônus pagos junto com ele. */
  bonuses: Entry[];
}

export interface UndoState {
  /** A atividade como está agora, já com o registro. */
  activity: Activity;
  /** O agregado do dia do registro, já com ele. */
  daily: Daily | undefined;
  /** A missão do dia do registro. */
  mission: Mission | undefined;
  timeZone: string;
}

export interface UndoPlan {
  /** A sequência a restaurar, `null` para apagar ou `undefined` para não mexer. */
  streak?: Streak | null;
  /** Se a contagem da negativa volta um passo. */
  revertPenalty: boolean;
  /** Os bônus que deixam de valer sem o registro. */
  bonuses: Entry[];
}

/**
 * O que desfazer junto com o registro. A sequência volta quando o dia fica sem registro; a
 * escalada volta um passo, a não ser que o custo tenha sido zerado depois; os bônus de hábito e
 * de missão são estornados quando a condição deixa de valer.
 */
export function undoPlan(
  { entry, previousStreak, bonuses }: Registration,
  { activity, daily, mission, timeZone }: UndoState,
): UndoPlan {
  const date = dayKey(entry.at, timeZone);
  const remaining = Math.max(0, (daily?.counts[entry.refId] ?? 1) - 1);
  const plan: UndoPlan = { revertPenalty: false, bonuses: [] };

  if (entry.type === 'loss') {
    // Zerado depois do registro, a contagem já está abaixo do nível dele.
    plan.revertPenalty = activity.penaltyCount >= (entry.level ?? 1);
    return plan;
  }

  if (remaining === 0 && activity.streak?.lastDay === date) {
    plan.streak = previousStreak ?? null;
  }

  const habitBonus = habitBonusToUndo();
  if (habitBonus) plan.bonuses.push(habitBonus);
  const missionBonus = missionBonusToUndo();
  if (missionBonus) plan.bonuses.push(missionBonus);
  return plan;

  function habitBonusToUndo(): Entry | null {
    const requested = bonuses.find((bonus) => bonus.source === 'habit');
    if (requested) return remaining < (requested.target ?? 1) ? requested : null;
    // Pago por outro registro do dia (ou por outro aparelho).
    const { habit } = activity;
    if (!habit || remaining >= habit.target || (daily?.bonuses[entry.refId] ?? 0) <= 0) return null;
    const id = habitBonusId(activity.id, date, daily?.undone[activity.id] ?? 0);
    return { ...habitBonusEntry({ ...activity, habit }, entry.at, entry.deviceId), id };
  }

  function missionBonusToUndo(): Entry | null {
    if (remaining > 0) return null;
    const requested = bonuses.find((bonus) => bonus.source === 'mission');
    if (requested) return requested;
    if (!mission?.completedAt || !mission.activities.some(({ id }) => id === entry.refId)) {
      return null;
    }
    const id = missionBonusId(mission.date, mission.reversals ?? 0);
    return { ...missionBonusEntry(mission, mission.completedAt, entry.deviceId), id };
  }
}
