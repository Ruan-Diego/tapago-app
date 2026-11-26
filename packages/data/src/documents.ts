/** Formato neutro de leitura e escrita, traduzido para cada SDK pelos backends. */

/** Soma atômica no servidor: funciona offline e junta mudanças de vários aparelhos. */
export class Increment {
  constructor(readonly amount: number) {}
}

export type DocData = Record<string, unknown>;

export type WriteOp =
  /** `set` cria ou substitui; `merge` soma campos a um documento que pode nem existir. */
  | { kind: 'set' | 'merge' | 'update'; path: string; data: DocData }
  | { kind: 'delete'; path: string };

export interface QuerySpec {
  /** Caminho da coleção. */
  path: string;
  orderBy: { field: string; direction: 'asc' | 'desc' };
  /** Filtro `>=` no mesmo campo da ordenação. */
  from?: string | Date;
  /** Continua depois deste valor do campo ordenado (paginação). */
  after?: Date;
  limit?: number;
}

export interface DocRecord {
  id: string;
  data: DocData;
}

export interface QueryResult {
  docs: DocRecord[];
  /** `true` enquanto o servidor ainda não confirmou o que veio do cache local. */
  fromCache: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Troca cada `Increment` pelo valor equivalente do SDK. */
export function encodeData(data: DocData, increment: (amount: number) => unknown): DocData {
  const encode = (value: unknown): unknown => {
    if (value instanceof Increment) return increment(value.amount);
    if (!isPlainObject(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child)]));
  };
  return encode(data) as DocData;
}

/** Converte os `Timestamp` de qualquer um dos SDKs em `Date`. */
export function decodeData(data: DocData): DocData {
  const decode = (value: unknown): unknown => {
    if (typeof value !== 'object' || value === null) return value;
    if ('toDate' in value && typeof value.toDate === 'function') return value.toDate();
    if (!isPlainObject(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decode(child)]));
  };
  return decode(data) as DocData;
}
