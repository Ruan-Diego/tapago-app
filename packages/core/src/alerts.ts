/**
 * Avisos do timer (NOTIF-01, 02, 03). Sem servidor: cada aparelho que vê a sessão calcula aqui
 * os horários e agenda os próprios avisos, refazendo a conta quando a sessão muda.
 */
import type { Session } from './ledger';
import { MINUTE_MS } from './session';
import type { UserProfile } from './user';

export const WARNING_MS = 5 * MINUTE_MS;

/**
 * Um aviso que vence dentro desta folga não é mais cancelado. Sem isso, o fim normal da sessão
 * (aqui ou em outro aparelho, com o relógio um pouco diferente) apagaria o próprio aviso.
 */
export const DUE_TOLERANCE_MS = 10_000;

const PREFIX = 'tapago-timer';

export type AlertKind = 'warn5' | 'end';

export interface TimerAlert {
  /** Sessão, tipo e horário: o mesmo aviso nunca é agendado duas vezes. */
  id: string;
  kind: AlertKind;
  at: Date;
  /** Fim da sessão quando o aviso foi calculado. */
  endsAt: Date;
  title: string;
  body: string;
}

export interface AlertOptions {
  prefs: Pick<UserProfile['notif'], 'end' | 'warn5'>;
  timeZone: string;
  now: Date;
}

/** Avisos futuros de uma sessão. Sessão pausada ou encerrada não tem nenhum. */
export function timerAlerts(
  session: Session | null,
  { prefs, timeZone, now }: AlertOptions,
): TimerAlert[] {
  if (!session || session.status !== 'running') return [];
  const { endsAt, itemName } = session;
  const ends = endsAt.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
  const alert = (kind: AlertKind, at: Date, title: string, body: string): TimerAlert => ({
    id: `${PREFIX}:${session.id}:${kind}:${at.getTime()}`,
    kind,
    at,
    endsAt,
    title,
    body,
  });

  const alerts: TimerAlert[] = [];
  // Só em sessões de mais de 5 minutos.
  if (prefs.warn5 && session.totalMs > WARNING_MS) {
    alerts.push(
      alert(
        'warn5',
        new Date(endsAt.getTime() - WARNING_MS),
        'Faltam 5 minutos',
        `${itemName} termina às ${ends}.`,
      ),
    );
  }
  if (prefs.end) {
    alerts.push(
      alert('end', endsAt, 'Tempo esgotado', `Acabou: ${itemName}. Bora voltar pras atividades?`),
    );
  }
  return alerts.filter((item) => item.at.getTime() > now.getTime());
}

/** Horário embutido no id, ou `null` se o id não for de um aviso do timer. */
function alertTime(id: string): number | null {
  if (!id.startsWith(`${PREFIX}:`)) return null;
  const time = Number(id.slice(id.lastIndexOf(':') + 1));
  return Number.isFinite(time) ? time : null;
}

/**
 * O que fazer para os avisos agendados ficarem iguais aos desejados. Ids que não são do timer
 * ficam como estão.
 */
export function alertChanges(
  desired: readonly TimerAlert[],
  scheduled: readonly string[],
  now: Date,
): { cancel: string[]; schedule: TimerAlert[] } {
  const wanted = new Set(desired.map((alert) => alert.id));
  const present = new Set(scheduled);
  return {
    cancel: scheduled.filter((id) => {
      const at = alertTime(id);
      return at !== null && !wanted.has(id) && at > now.getTime() + DUE_TOLERANCE_MS;
    }),
    schedule: desired.filter((alert) => !present.has(alert.id)),
  };
}

/** Um "Faltam 5 minutos" que só pôde aparecer depois do fim (aba ou app dormindo) é descartado. */
export function isAlertStale(alert: TimerAlert, now: Date): boolean {
  return alert.kind === 'warn5' && now.getTime() >= alert.endsAt.getTime();
}
