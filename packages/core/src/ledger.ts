import { z } from 'zod';

import { LIMITS } from './limits';

const name = z.string().min(1).max(LIMITS.nameMax);
const value = z.number().int().min(LIMITS.valueMin).max(LIMITS.valueMax);
const minutes = z.number().int().min(LIMITS.minutesMin).max(LIMITS.minutesMax);

export const activityKindSchema = z.enum(['positive', 'negative']);
export type ActivityKind = z.infer<typeof activityKindSchema>;

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

export const entryTypeSchema = z.enum(['earn', 'loss', 'purchase', 'use', 'reversal']);
export type EntryType = z.infer<typeof entryTypeSchema>;

/** Documento `users/{uid}/entries/{id}`: o livro-caixa, que só recebe inclusões. */
export const entrySchema = z.object({
  type: entryTypeSchema,
  refId: z.string().min(1),
  name,
  value,
  minutes,
  at: z.date(),
  deviceId: z.string().min(1),
  /** Só em estornos (R8): o lançamento desfeito. */
  reverses: z.string().min(1).optional(),
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

/** Documento `users/{uid}/state/session` (usado a partir da F2). */
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
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
});

export type Activity = z.infer<typeof activitySchema> & { id: string };
export type ShopItem = z.infer<typeof shopItemSchema> & { id: string };
export type EntryData = z.infer<typeof entrySchema>;
export type Entry = EntryData & { id: string };
export type InventoryItem = z.infer<typeof inventoryItemSchema> & { id: string };
export type Session = z.infer<typeof sessionSchema>;
export type Daily = z.infer<typeof dailySchema>;

/** Campos somáveis do agregado diário. */
export type DailyTotals = Omit<Daily, 'date' | 'counts'>;

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
  type: Exclude<EntryType, 'reversal'>,
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
