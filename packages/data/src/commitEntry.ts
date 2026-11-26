import { entrySchema, type Entry } from '@tapago/core';

import { backend } from './backend';
import type { WriteOp } from './documents';

export interface WrittenEntry {
  /** O lançamento do lote, já com o id. */
  entry: Entry;
  /** Resolve quando o servidor confirma. */
  write: Promise<void>;
}

/** Grava um lote que começa por um lançamento e devolve o lançamento junto. */
export function commitEntry(ops: readonly WriteOp[]): WrittenEntry {
  const [first] = ops;
  if (first?.kind !== 'set') throw new Error('O lote não começa por um lançamento.');
  const id = first.path.slice(first.path.lastIndexOf('/') + 1);
  const entry = { ...entrySchema.parse(first.data), id };
  return { entry, write: backend.commit(ops) };
}
