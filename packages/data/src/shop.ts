import { purchaseCheck, shopItemSchema, type ShopItem, type ShopItemValues } from '@tapago/core';

import { backend } from './backend';
import type { WriteOp } from './documents';
import { parseDocs } from './parse';
import { newSessionIds } from './timer';
import type { Unsubscribe } from './types';
import {
  archiveOp,
  createShopItemOp,
  paths,
  purchaseAndUseOps,
  purchaseOps,
  updateShopItemOp,
  type ActionContext,
} from './writes';

export interface Purchase {
  /** Lançamento da compra: identifica o recibo. */
  entryId: string;
  write: Promise<void>;
}

function purchase(
  { uid }: ActionContext,
  item: ShopItem,
  balance: number,
  ops: (entryId: string) => WriteOp[],
): Purchase {
  const entryId = backend.newId(paths.entries(uid));
  const write = purchaseCheck(balance, item.value).allowed
    ? backend.commit(ops(entryId))
    : Promise.reject(new Error('Saldo insuficiente.'));
  return { entryId, write };
}

export const shopRepository = {
  watch(
    uid: string,
    onChange: (items: ShopItem[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return backend.watchQuery(
      { path: paths.shopItems(uid), orderBy: { field: 'order', direction: 'asc' } },
      ({ docs }) => onChange(parseDocs(shopItemSchema, docs)),
      onError,
    );
  },

  create(uid: string, values: ShopItemValues): Promise<void> {
    const id = backend.newId(paths.shopItems(uid));
    return backend.commit([createShopItemOp(uid, id, values, new Date())]);
  },

  update(uid: string, id: string, values: ShopItemValues): Promise<void> {
    return backend.commit([updateShopItemOp(uid, id, values)]);
  },

  archive(uid: string, id: string): Promise<void> {
    return backend.commit([archiveOp(paths.shopItems(uid), id)]);
  },

  /** Comprar e guardar no inventário (SHOP-02, 03). Sem saldo, não grava nada (R3). */
  buyAndKeep(context: ActionContext, item: ShopItem, balance: number): Purchase {
    return purchase(context, item, balance, (entryId) =>
      purchaseOps(context, item, {
        entryId,
        inventoryId: backend.newId(paths.inventory(context.uid)),
      }),
    );
  },

  /** Comprar e usar agora: já começa o timer (R4). */
  buyAndUse(context: ActionContext, item: ShopItem, balance: number): Purchase {
    return purchase(context, item, balance, (entryId) =>
      purchaseAndUseOps(context, item, { entryId, ...newSessionIds(context.uid) }),
    );
  },
};
