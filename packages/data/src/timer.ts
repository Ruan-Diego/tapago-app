import {
  entrySchema,
  leftoverMinutes,
  pauseChange,
  resumeChange,
  sessionSchema,
  usedMinutes,
  type InventoryItem,
  type Session,
} from '@tapago/core';

import { backend } from './backend';
import { decodeData, type DocData } from './documents';
import type { Unsubscribe } from './types';
import {
  changeSessionOp,
  finishSessionOps,
  paths,
  startStoredOps,
  stashSessionOps,
  type ActionContext,
  type SessionIds,
} from './writes';

export interface TimerSnapshot {
  /** `null`: nenhum timer. */
  session: Session | null;
  /** `true` enquanto o servidor ainda não confirmou o que veio do cache local. */
  fromCache: boolean;
}

export function newSessionIds(uid: string): SessionIds {
  // O id da sessão só precisa ser único: usa o mesmo gerador dos documentos.
  const entries = paths.entries(uid);
  return { sessionId: backend.newId(entries), useEntryId: backend.newId(entries) };
}

/** A sessão do timer, a mesma em todos os aparelhos (TMR-05). */
export const timerRepository = {
  watch(
    uid: string,
    onChange: (snapshot: TimerSnapshot) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return backend.watchDoc(
      paths.session(uid),
      ({ data, exists, fromCache }) => {
        if (!exists) return onChange({ session: null, fromCache });
        const parsed = sessionSchema.safeParse(decodeData(data as DocData));
        if (parsed.success) onChange({ session: parsed.data, fromCache });
        else onError(parsed.error);
      },
      onError,
    );
  },

  /** Começar um item guardado (INV-02). */
  startStored(context: ActionContext, stored: InventoryItem): Promise<void> {
    return backend.commit(startStoredOps(context, stored, newSessionIds(context.uid)));
  },

  pause(uid: string, session: Session, at: Date): Promise<void> {
    return backend.commit([changeSessionOp(uid, session, pauseChange(session, at))]);
  },

  resume(uid: string, session: Session, at: Date): Promise<void> {
    return backend.commit([changeSessionOp(uid, session, resumeChange(session, at))]);
  },

  /** Encerrar antes ou no fim: registra os minutos usados, sem reembolso (R6). */
  finish({ uid, at, timeZone }: ActionContext, session: Session): Promise<void> {
    return backend.commit(finishSessionOps(uid, session, usedMinutes(session, at), timeZone));
  },

  /**
   * Guardar o resto para depois. O item da loja e o preço vêm do lançamento `use` da sessão (do
   * cache, sem internet). Devolve `null` se não sobrou ao menos 1 minuto ou se o lançamento não
   * pôde ser lido; aí nada é gravado.
   */
  async stash(
    context: ActionContext,
    session: Session,
  ): Promise<{ leftover: number; write: Promise<void> } | null> {
    const leftover = leftoverMinutes(session, context.at);
    if (leftover < 1) return null;
    const { data, exists } = await backend.getDoc(
      `${paths.entries(context.uid)}/${session.useEntryId}`,
    );
    const use = exists ? entrySchema.safeParse(decodeData(data as DocData)) : null;
    if (!use?.success) return null;
    const ops = stashSessionOps(
      context,
      session,
      usedMinutes(session, context.at),
      leftover,
      { shopItemId: use.data.refId, price: use.data.value },
      backend.newId(paths.inventory(context.uid)),
    );
    return { leftover, write: backend.commit(ops) };
  },
};
