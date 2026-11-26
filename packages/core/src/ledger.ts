import { z } from 'zod';

import { LIMITS, MISSION_BONUS } from './limits';

const name = z.string().min(1).max(LIMITS.nameMax);
const value = z.number().int().min(LIMITS.valueMin).max(LIMITS.valueMax);
const minutes = z.number().int().min(LIMITS.minutesMin).max(LIMITS.minutesMax);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const habitTarget = z.number().int().min(LIMITS.habitTargetMin).max(LIMITS.habitTargetMax);

export const activityKindSchema = z.enum(['positive', 'negative']);
export type ActivityKind = z.infer<typeof activityKindSchema>;

/** Hábito diário (R13): meta de registros no dia e bônus ao completar. */
export const habitSchema = z.object({ target: habitTarget, bonus: value });
export type Habit = z.infer<typeof habitSchema>;

/** Sequência de uma positiva (R14): dias seguidos terminando em `lastDay`. */
export const streakSchema = z.object({ days: z.number().int().min(1), lastDay: day });
export type Streak = z.infer<typeof streakSchema>;

/** Documento `users/{uid}/activities/{id}`. */
export const activitySchema = z.object({
  name,
  description: z.string().max(LIMITS.descriptionMax),
  kind: activityKindSchema,
  value,
  minutes,
  order: z.number(),
  archived: z.boolean(),
  createdAt: z.date(),
  /** Só positivas. */
  habit: habitSchema.optional(),
  /** Só positivas: quanto o valor sobe a cada dia de sequência. */
  streakStep: z.number().int().min(0).max(LIMITS.valueMax).default(0),
  /** Só positivas; ausente antes do primeiro registro. */
  streak: streakSchema.optional(),
  /** Só negativas: registros desde o último zeramento (R15). */
  penaltyCount: z.number().int().min(0).default(0),
});

/** Documento `users/{uid}/shopItems/{id}`. */
export const shopItemSchema = z.object({
  name,
  value,
  minutes,
  order: z.number(),
  archived: z.boolean(),
  createdAt: z.date(),
});

export const entryTypeSchema = z.enum(['earn', 'loss', 'purchase', 'use', 'reversal', 'bonus']);
export type EntryType = z.infer<typeof entryTypeSchema>;

export const bonusSourceSchema = z.enum(['habit', 'mission']);
export type BonusSource = z.infer<typeof bonusSourceSchema>;

/** Uma das atividades da missão do dia, com o nome da hora do sorteio. */
export const missionActivitySchema = z.object({ id: z.string().min(1), name });
export type MissionActivity = z.infer<typeof missionActivitySchema>;

const missionActivities = z.tuple([missionActivitySchema, missionActivitySchema]);

/** Documento `users/{uid}/missions/{AAAA-MM-DD}` (R17). */
export const missionSchema = z.object({
  date: day,
  activities: missionActivities,
  bonus: value,
  createdAt: z.date(),
  /** Quando o bônus foi pago; ausente enquanto a missão não é cumprida. */
  completedAt: z.date().optional(),
});
export type Mission = z.infer<typeof missionSchema>;

/** Documento `users/{uid}/entries/{id}`: o livro-caixa, que só recebe inclusões. */
export const entrySchema = z
  .object({
    type: entryTypeSchema,
    refId: z.string().min(1),
    name,
    value,
    /** Zero só no bônus, que não conta como tempo. */
    minutes: z.number().int().min(0).max(LIMITS.minutesMax),
    at: z.date(),
    deviceId: z.string().min(1),
    /** Só em estornos (R8): o lançamento desfeito. */
    reverses: z.string().min(1).optional(),
    /** Só em `earn` e `loss`: o valor inicial e o nível que explicam o valor (R14, R15). */
    base: value.optional(),
    level: z.number().int().min(1).optional(),
    /** Só em bônus: de onde veio. */
    source: bonusSourceSchema.optional(),
    /** Só no bônus de hábito: a meta que foi cumprida. */
    target: habitTarget.optional(),
    /** Só no bônus de missão: as atividades que a cumpriram. */
    activities: missionActivities.optional(),
  })
  .refine((entry) => (entry.type === 'bonus') === (entry.minutes === 0), {
    path: ['minutes'],
    message: 'Só o bônus não tem tempo.',
  })
  .refine((entry) => (entry.type === 'bonus') === (entry.source !== undefined), {
    path: ['source'],
    message: 'Só o bônus tem origem.',
  });

/** Documento `users/{uid}/inventory/{id}`. */
export const inventoryItemSchema = z.object({
  shopItemId: z.string().min(1),
  name,
  value,
  minutes,
  purchaseEntryId: z.string().min(1),
  purchasedAt: z.date(),
});

/** Documento `users/{uid}/state/session`: no máximo um por conta (R5). */
export const sessionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['running', 'paused']),
  itemName: name,
  totalMs: z.number().int().positive(),
  startedAt: z.date(),
  endsAt: z.date(),
  remainingMs: z.number().int().min(0),
  useEntryId: z.string().min(1),
  originDevice: z.string().min(1),
});

const total = z.number().int().default(0);

/** Documento `users/{uid}/daily/{AAAA-MM-DD}`: agregado que alimenta o Histórico. */
export const dailySchema = z.object({
  date: day,
  earned: total,
  lost: total,
  spent: total,
  posMin: total,
  negMin: total,
  leisureMin: total,
  posCount: total,
  negCount: total,
  buyCount: total,
  /** Registros do dia por atividade (`refId` → quantidade). */
  counts: z.record(z.string(), z.number().int()).default({}),
  /** Bônus de hábito pagos no dia, por atividade (`refId` → quantidade). */
  bonuses: z.record(z.string(), z.number().int()).default({}),
});

export type Activity = z.infer<typeof activitySchema> & { id: string };
export type ShopItem = z.infer<typeof shopItemSchema> & { id: string };
export type EntryData = z.infer<typeof entrySchema>;
export type Entry = EntryData & { id: string };
export type InventoryItem = z.infer<typeof inventoryItemSchema> & { id: string };
export type Session = z.infer<typeof sessionSchema>;
export type Daily = z.infer<typeof dailySchema>;

/** Campos somáveis do agregado diário. */
export type DailyTotals = Omit<Daily, 'date' | 'counts' | 'bonuses'>;

export const DAILY_FIELDS = [
  'earned',
  'lost',
  'spent',
  'posMin',
  'negMin',
  'leisureMin',
  'posCount',
  'negCount',
  'buyCount',
] as const satisfies readonly (keyof DailyTotals)[];

export interface EntrySource {
  id: string;
  name: string;
  value: number;
  minutes: number;
}

/** O lançamento guarda uma cópia do nome e do valor: mudar o preço não altera o passado (R2). */
export function entryFrom(
  type: Exclude<EntryType, 'reversal' | 'bonus'>,
  source: EntrySource,
  at: Date,
  deviceId: string,
): EntryData {
  return {
    type,
    refId: source.id,
    name: source.name,
    value: source.value,
    minutes: source.minutes,
    at,
    deviceId,
  };
}

/** O bônus do hábito: lançamento próprio, sem tempo e sem contar como registro (R13). */
export function habitBonusEntry(
  activity: { id: string; name: string; habit: Habit },
  at: Date,
  deviceId: string,
): EntryData {
  return {
    type: 'bonus',
    source: 'habit',
    refId: activity.id,
    name: activity.name,
    value: activity.habit.bonus,
    minutes: 0,
    target: activity.habit.target,
    at,
    deviceId,
  };
}

/** O bônus da missão do dia (R18). O `refId` é a data da missão. */
export function missionBonusEntry(
  mission: Pick<Mission, 'date' | 'activities'>,
  at: Date,
  deviceId: string,
): EntryData {
  return {
    type: 'bonus',
    source: 'mission',
    refId: mission.date,
    name: 'Missão do dia',
    value: MISSION_BONUS,
    minutes: 0,
    activities: mission.activities,
    at,
    deviceId,
  };
}

export function entryTypeFor(kind: ActivityKind): 'earn' | 'loss' {
  return kind === 'positive' ? 'earn' : 'loss';
}

/**
 * Efeito de um lançamento no saldo, em centavos. Estornos precisam do lançamento desfeito:
 * eles aplicam o valor inverso (R8).
 */
export function signedValue(entry: EntryData, reversed?: EntryData): number {
  switch (entry.type) {
    case 'earn':
    case 'bonus':
      return entry.value;
    case 'loss':
    case 'purchase':
      return -entry.value;
    case 'use':
      return 0;
    case 'reversal':
      if (!reversed || reversed.type === 'reversal') {
        throw new Error('Estorno sem o lançamento original.');
      }
      // `0 -` evita o `-0` no estorno de um `use`.
      return 0 - signedValue(reversed);
  }
}

/** Saldo é a soma dos lançamentos. */
export function balanceFromEntries(entries: readonly Entry[]): number {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return entries.reduce(
    (balance, entry) =>
      balance + signedValue(entry, entry.reverses ? byId.get(entry.reverses) : undefined),
    0,
  );
}

/** Quanto um lançamento soma no agregado do dia. A escrita em lote usa os mesmos números. */
export function dailyDelta(entry: EntryData, reversed?: EntryData): Partial<DailyTotals> {
  switch (entry.type) {
    case 'earn':
      return { earned: entry.value, posMin: entry.minutes, posCount: 1 };
    case 'loss':
      return { lost: entry.value, negMin: entry.minutes, negCount: 1 };
    case 'bonus':
      // Soma nos ganhos e na meta semanal, sem contar como registro nem como tempo.
      return { earned: entry.value };
    case 'purchase':
      // Item guardado não entra nas horas de lazer (R9).
      return { spent: entry.value, buyCount: 1 };
    case 'use':
      return { leisureMin: entry.minutes };
    case 'reversal': {
      if (!reversed || reversed.type === 'reversal') {
        throw new Error('Estorno sem o lançamento original.');
      }
      return Object.fromEntries(
        Object.entries(dailyDelta(reversed)).map(([field, amount]) => [field, -amount]),
      );
    }
  }
}

export function emptyDaily(date: string): Daily {
  return dailySchema.parse({ date });
}

/** Cheque de compra: só com saldo maior ou igual ao preço (R3). */
export function purchaseCheck(balance: number, price: number) {
  const missing = Math.max(0, price - balance);
  return { allowed: missing === 0, missing };
}

/** Itens arquivados somem das listas, mas continuam no histórico (R10). */
export function activeInOrder<T extends { archived: boolean; order: number; name: string }>(
  items: readonly T[],
): T[] {
  return items
    .filter((item) => !item.archived)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'));
}
