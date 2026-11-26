import { UNDO_WINDOW_MS, type Registration } from '@tapago/core';
import { create } from 'zustand';

export interface PendingUndo {
  id: string;
  registration: Registration;
  /** O nome da atividade, para o leitor de tela dizer o que o botão desfaz. */
  name: string;
  text: string;
  /** Etiqueta em destaque, como "+R$ 10". */
  amount: string;
  /** Até quando vale, em milissegundos. */
  expiresAt: number;
}

/** Os registros que ainda podem ser desfeitos, do mais antigo ao mais novo. */
export const useUndo = create<{ pending: PendingUndo[] }>(() => ({ pending: [] }));

export function offerUndo(
  registration: Registration,
  message: Pick<PendingUndo, 'name' | 'text' | 'amount'>,
) {
  const id = registration.entry.id;
  const expiresAt = Date.now() + UNDO_WINDOW_MS;
  useUndo.setState(({ pending }) => ({
    pending: [...pending, { ...message, id, registration, expiresAt }],
  }));
}

/** Tira um registro da fila. `false` se ele já tinha saído ou vencido. */
export function takeUndo(id: string): boolean {
  const { pending } = useUndo.getState();
  const found = pending.find((candidate) => candidate.id === id);
  if (!found) return false;
  useUndo.setState({ pending: pending.filter((candidate) => candidate.id !== id) });
  return found.expiresAt > Date.now();
}

export function dropExpired() {
  const now = Date.now();
  useUndo.setState(({ pending }) => ({
    pending: pending.filter((candidate) => candidate.expiresAt > now),
  }));
}

export function clearUndo() {
  useUndo.setState({ pending: [] });
}
