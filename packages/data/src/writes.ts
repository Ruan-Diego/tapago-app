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
  type Activity,
  type ActivityValues,
  type EntryData,
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
