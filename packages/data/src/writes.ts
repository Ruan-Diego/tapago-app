/**
 * O que cada ação grava ("Como cada ação escreve", no PRD). Cada função devolve as operações de
 * um único lote: lançamento, saldo e agregado do dia entram juntos ou não entram.
 */
import {
  DAILY_FIELDS,
  dailyDelta,
  dayKey,
  entryFrom,
  entryTypeFor,
  newSession,
  type Activity,
  type ActivityValues,
  type EntryData,
  type EntrySource,
  type InventoryItem,
  type Session,
  type SessionChange,
  type ShopItem,
  type ShopItemValues,
} from '@tapago/core';

import { Increment, type DocData, type WriteOp } from './documents';

export const paths = {
  user: (uid: string) => `users/${uid}`,
  activities: (uid: string) => `users/${uid}/activities`,
  shopItems: (uid: string) => `users/${uid}/shopItems`,
  entries: (uid: string) => `users/${uid}/entries`,
  inventory: (uid: string) => `users/${uid}/inventory`,
  daily: (uid: string) => `users/${uid}/daily`,
  /** Documento único: no máximo uma sessão por conta (R5). */
  session: (uid: string) => `users/${uid}/state/session`,
};

export interface ActionContext {
  uid: string;
  at: Date;
  deviceId: string;
  /** Fuso do usuário: define em qual dia o lançamento conta. */
  timeZone: string;
}

function dailyOp(
  { uid, at, timeZone }: ActionContext,
  entry: EntryData,
  countRef?: string,
): WriteOp {
  const date = dayKey(at, timeZone);
  const delta = dailyDelta(entry);
  const data: DocData = { date };
  for (const field of DAILY_FIELDS) {
    const amount = delta[field];
    if (amount) data[field] = new Increment(amount);
  }
  if (countRef) data.counts = { [countRef]: new Increment(1) };
  return { kind: 'merge', path: `${paths.daily(uid)}/${date}`, data };
}

/** Registrar atividade: lançamento + saldo + agregado do dia. */
export function registerActivityOps(
  context: ActionContext,
  activity: Activity,
  entryId: string,
): WriteOp[] {
  const { uid, at, deviceId } = context;
  const entry = entryFrom(entryTypeFor(activity.kind), activity, at, deviceId);
  const signed = activity.kind === 'positive' ? activity.value : -activity.value;
  return [
    { kind: 'set', path: `${paths.entries(uid)}/${entryId}`, data: { ...entry } },
    { kind: 'update', path: paths.user(uid), data: { balance: new Increment(signed) } },
    dailyOp(context, entry, activity.id),
  ];
}

/** Comprar e guardar: lançamento + saldo + agregado do dia + item no inventário. */
export function purchaseOps(
  context: ActionContext,
  item: ShopItem,
  ids: { entryId: string; inventoryId: string },
): WriteOp[] {
  const { uid, at, deviceId } = context;
  const entry = entryFrom('purchase', item, at, deviceId);
  return [
    { kind: 'set', path: `${paths.entries(uid)}/${ids.entryId}`, data: { ...entry } },
    { kind: 'update', path: paths.user(uid), data: { balance: new Increment(-item.value) } },
    dailyOp(context, entry),
    {
      kind: 'set',
      path: `${paths.inventory(uid)}/${ids.inventoryId}`,
      data: {
        shopItemId: item.id,
        name: item.name,
        value: item.value,
        minutes: item.minutes,
        purchaseEntryId: ids.entryId,
        purchasedAt: at,
      },
    },
  ];
}

export interface SessionIds {
  sessionId: string;
  useEntryId: string;
}

/**
 * Começar um uso: lançamento `use` + sessão. O tempo de lazer só entra no agregado do dia quando a
 * sessão acaba, com os minutos realmente usados (R9).
 */
function startSessionOps(
  { uid, at, deviceId }: ActionContext,
  source: EntrySource,
  { sessionId, useEntryId }: SessionIds,
): WriteOp[] {
  const entry = entryFrom('use', source, at, deviceId);
  const session = newSession({
    id: sessionId,
    itemName: source.name,
    minutes: source.minutes,
    useEntryId,
    deviceId,
    at,
  });
  return [
    { kind: 'set', path: `${paths.entries(uid)}/${useEntryId}`, data: { ...entry } },
    { kind: 'set', path: paths.session(uid), data: { ...session } },
  ];
}

/** Comprar e usar agora (R4): a compra e o começo do uso em um só lote. */
export function purchaseAndUseOps(
  context: ActionContext,
  item: ShopItem,
  ids: SessionIds & { entryId: string },
): WriteOp[] {
  const { uid, at, deviceId } = context;
  const entry = entryFrom('purchase', item, at, deviceId);
  return [
    { kind: 'set', path: `${paths.entries(uid)}/${ids.entryId}`, data: { ...entry } },
    { kind: 'update', path: paths.user(uid), data: { balance: new Increment(-item.value) } },
    dailyOp(context, entry),
    ...startSessionOps(context, item, ids),
  ];
}

/** Começar um item guardado: o timer começa e o item sai do inventário (INV-02). */
export function startStoredOps(
  context: ActionContext,
  stored: InventoryItem,
  ids: SessionIds,
): WriteOp[] {
  const { shopItemId, name, value, minutes } = stored;
  return [
    ...startSessionOps(context, { id: shopItemId, name, value, minutes }, ids),
    { kind: 'delete', path: `${paths.inventory(context.uid)}/${stored.id}` },
  ];
}

/**
 * Pausar ou retomar. O `id` vai junto para as regras recusarem a mudança de um aparelho
 * desatualizado sobre outra sessão.
 */
export function changeSessionOp(uid: string, session: Session, change: SessionChange): WriteOp {
  return { kind: 'update', path: paths.session(uid), data: { id: session.id, ...change } };
}

/**
 * Encerrar: minutos usados no lançamento + tempo de lazer no dia em que o uso começou + sessão
 * apagada. As regras só aceitam o lote enquanto esta é a sessão atual, então dois aparelhos não
 * contam o mesmo uso duas vezes.
 */
export function finishSessionOps(
  uid: string,
  session: Session,
  minutes: number,
  timeZone: string,
): WriteOp[] {
  const date = dayKey(session.startedAt, timeZone);
  return [
    { kind: 'update', path: `${paths.entries(uid)}/${session.useEntryId}`, data: { minutes } },
    {
      kind: 'merge',
      path: `${paths.daily(uid)}/${date}`,
      data: { date, leisureMin: new Increment(minutes) },
    },
    { kind: 'delete', path: paths.session(uid) },
  ];
}

/** `order` é o horário de criação: o item novo entra no fim da lista. */
export function createActivityOp(
  uid: string,
  id: string,
  values: ActivityValues,
  at: Date,
): WriteOp {
  return {
    kind: 'set',
    path: `${paths.activities(uid)}/${id}`,
    data: { ...values, order: at.getTime(), archived: false, createdAt: at },
  };
}

/** O tipo (+/−) é escolhido na criação e não muda depois. */
export function updateActivityOp(uid: string, id: string, values: ActivityValues): WriteOp {
  const { name, description, value, minutes } = values;
  return {
    kind: 'update',
    path: `${paths.activities(uid)}/${id}`,
    data: { name, description, value, minutes },
  };
}

export function createShopItemOp(
  uid: string,
  id: string,
  values: ShopItemValues,
  at: Date,
): WriteOp {
  const { name, value, minutes } = values;
  return {
    kind: 'set',
    path: `${paths.shopItems(uid)}/${id}`,
    data: { name, value, minutes, order: at.getTime(), archived: false, createdAt: at },
  };
}

export function updateShopItemOp(uid: string, id: string, values: ShopItemValues): WriteOp {
  const { name, value, minutes } = values;
  return {
    kind: 'update',
    path: `${paths.shopItems(uid)}/${id}`,
    data: { name, value, minutes },
  };
}

/** Arquivar em vez de apagar (R10). */
export function archiveOp(collectionPath: string, id: string): WriteOp {
  return { kind: 'update', path: `${collectionPath}/${id}`, data: { archived: true } };
}
