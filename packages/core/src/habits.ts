/** Hábitos diários, sequência das positivas e escalada das negativas (R13 a R16). */
import { addDays } from './days';
import type { Activity, Streak } from './ledger';
import { LIMITS } from './limits';

/** O valor calculado nunca passa do teto de um lançamento (R16). */
const capped = (cents: number) => Math.min(cents, LIMITS.valueMax);

/** Dias seguidos ainda valendo: a sequência vive enquanto o último registro for de ontem ou hoje. */
export function aliveStreak(streak: Streak | undefined, today: string): number {
  return streak && streak.lastDay >= addDays(today, -1) ? streak.days : 0;
}

/**
 * O dia da sequência que um registro feito hoje ocupa (1 = primeiro dia). Um registro de um dia
 * que aqui ainda é amanhã (relógio de outro aparelho) conta como o de hoje.
 */
function streakLevel(streak: Streak | undefined, today: string): number {
  const alive = aliveStreak(streak, today);
  if (!streak || alive === 0) return 1;
  return streak.lastDay >= today ? alive : alive + 1;
}

/** A sequência depois de um registro feito hoje. Ela nunca volta para um dia anterior. */
export function nextStreak(streak: Streak | undefined, today: string): Streak {
  if (streak && streak.lastDay > today) return streak;
  return { days: streakLevel(streak, today), lastDay: today };
}

export interface Charge {
  /** Centavos que o registro paga ou cobra. */
  value: number;
  /** Dia da sequência (positiva) ou número do registro desde o zeramento (negativa), de 1 em diante. */
  level: number;
}

type Chargeable = Pick<Activity, 'kind' | 'value' | 'streakStep' | 'streak' | 'penaltyCount'>;

/** O que o próximo toque vai pagar ou cobrar (R14, R15). */
export function nextCharge(activity: Chargeable, today: string): Charge {
  if (activity.kind === 'negative') {
    const level = activity.penaltyCount + 1;
    return { value: capped(activity.value * level), level };
  }
  const level = streakLevel(activity.streak, today);
  return { value: capped(activity.value + activity.streakStep * (level - 1)), level };
}

export interface HabitProgress {
  /** Registros do dia, sem passar da meta. */
  done: number;
  target: number;
  complete: boolean;
}

/** Progresso do hábito no dia (HAB-02), ou `null` se a atividade não é um hábito. */
export function habitProgress(
  activity: Pick<Activity, 'kind' | 'habit'>,
  todayCount: number,
): HabitProgress | null {
  if (activity.kind !== 'positive' || !activity.habit) return null;
  const { target } = activity.habit;
  return {
    done: Math.min(Math.max(0, todayCount), target),
    target,
    complete: todayCount >= target,
  };
}

/**
 * Direito ao bônus (R13): a meta foi atingida e o bônus do dia ainda não saiu. `todayCount`
 * inclui o registro que está sendo feito.
 */
export function earnsHabitBonus(
  activity: Pick<Activity, 'kind' | 'habit'>,
  todayCount: number,
  alreadyPaid: boolean,
): boolean {
  return !alreadyPaid && habitProgress(activity, todayCount)?.complete === true;
}

/** Id fixo do bônus: o servidor só aceita o primeiro de cada atividade em cada dia. */
export function habitBonusId(activityId: string, day: string): string {
  return `habit_${activityId}_${day}`;
}
