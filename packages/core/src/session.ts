/**
 * Timer do lazer. A sessão guarda o horário de fim, não uma contagem: o restante continua certo
 * com o app fechado e é o mesmo em qualquer aparelho (TMR-01, TMR-05).
 */
import type { Session } from './ledger';

export const MINUTE_MS = 60_000;

export interface SessionStart {
  /** Id novo a cada sessão: identifica os avisos agendados. */
  id: string;
  itemName: string;
  minutes: number;
  useEntryId: string;
  deviceId: string;
  at: Date;
}

export function newSession({
  id,
  itemName,
  minutes,
  useEntryId,
  deviceId,
  at,
}: SessionStart): Session {
  const totalMs = minutes * MINUTE_MS;
  return {
    id,
    status: 'running',
    itemName,
    totalMs,
    startedAt: at,
    endsAt: new Date(at.getTime() + totalMs),
    remainingMs: totalMs,
    useEntryId,
    originDevice: deviceId,
  };
}

/** Quanto falta, entre 0 e a duração do item. */
export function remainingMs(session: Session, now: Date): number {
  const left =
    session.status === 'paused' ? session.remainingMs : session.endsAt.getTime() - now.getTime();
  // O relógio de outro aparelho pode estar adiantado: nunca mostra mais que a duração.
  return Math.min(session.totalMs, Math.max(0, left));
}

/** Pausada nunca acaba sozinha. */
export function isExpired(session: Session, now: Date): boolean {
  return session.status === 'running' && session.endsAt.getTime() <= now.getTime();
}

/** O que muda na sessão ao pausar ou retomar. */
export type SessionChange = Pick<Session, 'status' | 'endsAt' | 'remainingMs'>;

/** Pausar congela o restante (R7). */
export function pauseChange(session: Session, now: Date): SessionChange {
  return { status: 'paused', endsAt: session.endsAt, remainingMs: remainingMs(session, now) };
}

/** Retomar recalcula o fim (R7). */
export function resumeChange(session: Session, now: Date): SessionChange {
  const left = remainingMs(session, now);
  return { status: 'running', endsAt: new Date(now.getTime() + left), remainingMs: left };
}

/**
 * Minutos realmente usados, sem contar as pausas (R6). Ao menos 1, que é o menor tempo de um
 * lançamento.
 */
export function usedMinutes(session: Session, now: Date): number {
  const used = session.totalMs - remainingMs(session, now);
  return Math.max(1, Math.round(used / MINUTE_MS));
}

/** Contagem regressiva: "04:58" ou "1:05:00". Arredonda para cima: só mostra zero no fim. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const pad = (value: number) => String(value).padStart(2, '0');
  const rest = `${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
  return hours > 0 ? `${hours}:${rest}` : rest;
}
