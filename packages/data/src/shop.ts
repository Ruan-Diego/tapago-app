import { purchaseCheck, shopItemSchema, type ShopItem, type ShopItemValues } from '@tapago/core';

import { backend } from './backend';
import { parseDocs } from './parse';
import type { Unsubscribe } from './types';
import {
  archiveOp,
  createShopItemOp,
  paths,
  purchaseOps,
  updateShopItemOp,
  type ActionContext,
} from './writes';

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

  /** Compra direta para o inventário (SHOP-02). Sem saldo, não grava nada (R3). */
  buy(context: ActionContext, item: ShopItem, balance: number): Promise<void> {
    if (!purchaseCheck(balance, item.value).allowed) {
      return Promise.reject(new Error('Saldo insuficiente.'));
    }
    const { uid } = context;
    return backend.commit(
      purchaseOps(context, item, {
        entryId: backend.newId(paths.entries(uid)),
        inventoryId: backend.newId(paths.inventory(uid)),
      }),
    );
  },
};
