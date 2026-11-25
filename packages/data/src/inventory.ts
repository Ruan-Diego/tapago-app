import { inventoryItemSchema, type InventoryItem } from '@tapago/core';

import { backend } from './backend';
import { parseDocs } from './parse';
import type { Unsubscribe } from './types';
import { paths } from './writes';

export const inventoryRepository = {
  /** Itens guardados, com a compra mais recente primeiro (INV-01). */
  watch(
    uid: string,
    onChange: (items: InventoryItem[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return backend.watchQuery(
      { path: paths.inventory(uid), orderBy: { field: 'purchasedAt', direction: 'desc' } },
      ({ docs }) => onChange(parseDocs(inventoryItemSchema, docs)),
      onError,
    );
  },
};
