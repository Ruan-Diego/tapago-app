/** Missão do dia: sorteio, troca de atividade arquivada e cumprimento (R17, R18). */
import { addDays } from './days';
import { attemptId, type Activity, type Daily, type Mission, type MissionActivity } from './ledger';

/** Quantas atividades cada missão tem. */
export const MISSION_SIZE = 2;

type Candidate = Pick<Activity, 'id' | 'name' | 'kind' | 'archived'>;
type Pair = [MissionActivity, MissionActivity];

/** FNV-1a com mistura final: o mesmo texto dá o mesmo número em qualquer aparelho. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), 0x01000193);
  }
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
}

const samePair = (a: readonly { id: string }[], b: readonly { id: string }[]) =>
  a.every((item) => b.some((other) => other.id === item.id));

/**
 * Sorteia um par de positivas ativas que contenha todas as de `keep`. O par de ontem só sai se
 * for o único possível. `null` se não houver duas.
 */
function drawPair(
  seed: string,
  activities: readonly Candidate[],
  previous: Mission | undefined,
  keep: readonly string[] = [],
): [Candidate, Candidate] | null {
  // Ordem pelo id: o sorteio não depende de como cada aparelho listou as atividades.
  const active = activities
    .filter((activity) => activity.kind === 'positive' && !activity.archived)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const pairs: [Candidate, Candidate][] = [];
  active.forEach((first, index) => {
    for (const second of active.slice(index + 1)) {
      if (keep.every((id) => id === first.id || id === second.id)) pairs.push([first, second]);
    }
  });

  const fresh = previous ? pairs.filter((pair) => !samePair(pair, previous.activities)) : pairs;
  const options = fresh.length > 0 ? fresh : pairs;
  return options[hash(seed) % options.length] ?? null;
}

const asMissionActivity = ({ id, name }: Candidate): MissionActivity => ({ id, name });

/** A missão de um dia, determinada por `uid` + data. `null` com menos de 2 positivas. */
export function drawMission(
  uid: string,
  date: string,
  activities: readonly Candidate[],
  previous?: Mission,
): Pair | null {
  const pair = drawPair(`${uid}:${date}`, activities, previous);
  return pair && [asMissionActivity(pair[0]), asMissionActivity(pair[1])];
}

/**
 * Só conta como arquivada a atividade que este aparelho sabe que foi arquivada: uma que ainda não
 * chegou ao cache não é trocada.
 */
function isArchived(activities: readonly Candidate[], id: string): boolean {
  return activities.some((activity) => activity.id === id && activity.archived);
}

/**
 * A missão com as arquivadas trocadas, mantendo a posição das que ficam. `null` se nada precisa
 * mudar ou se não há substituta.
 */
export function replaceArchived(
  uid: string,
  mission: Mission,
  activities: readonly Candidate[],
  previous?: Mission,
): Pair | null {
  const kept = mission.activities.filter(({ id }) => !isArchived(activities, id));
  if (kept.length === MISSION_SIZE) return null;
  const keptIds = kept.map(({ id }) => id);
  const pair = drawPair(`${uid}:${mission.date}:troca`, activities, previous, keptIds);
  if (!pair) return null;

  const incoming = pair.filter(({ id }) => !keptIds.includes(id)).map(asMissionActivity);
  const [first, second] = mission.activities.map((current) =>
    keptIds.includes(current.id) ? current : incoming.shift()!,
  );
  return [first!, second!];
}

/** Cumprida: as duas atividades têm ao menos 1 registro no dia (R18). */
export function isMissionComplete(
  mission: Pick<Mission, 'activities'>,
  counts: Daily['counts'],
): boolean {
  return mission.activities.every(({ id }) => (counts[id] ?? 0) > 0);
}

/**
 * Se o cartão aparece. A missão cumprida fica; a pendente some enquanto tiver uma atividade
 * arquivada sem substituta.
 */
export function isMissionVisible(mission: Mission, activities: readonly Candidate[]): boolean {
  return (
    mission.completedAt !== undefined ||
    !mission.activities.some(({ id }) => isArchived(activities, id))
  );
}

export type MissionStep =
  | { type: 'create'; activities: Pair }
  | { type: 'replace'; mission: Mission; activities: Pair }
  | { type: 'pay'; mission: Mission };

interface MissionState {
  uid: string;
  today: string;
  /** As missões de ontem e de hoje que existirem. */
  missions: readonly Mission[];
  activities: readonly Candidate[];
  /** Registros de hoje por atividade. */
  counts: Daily['counts'];
}

/**
 * Id fixo do bônus: o servidor só aceita um por dia. Depois de estornado (`reversals` vezes), o
 * novo pagamento usa o id seguinte.
 */
export function missionBonusId(date: string, reversals = 0): string {
  return attemptId(`mission_${date}`, reversals);
}

/** O que o app precisa gravar agora sobre a missão de hoje, ou `null`. */
export function nextMissionStep({
  uid,
  today,
  missions,
  activities,
  counts,
}: MissionState): MissionStep | null {
  const previous = missions.find((mission) => mission.date === addDays(today, -1));
  const mission = missions.find((candidate) => candidate.date === today);
  if (!mission) {
    const drawn = drawMission(uid, today, activities, previous);
    return drawn && { type: 'create', activities: drawn };
  }
  if (mission.completedAt) return null;
  // Cumprir vem antes de trocar: o que já foi feito vale, mesmo que a atividade seja arquivada.
  if (isMissionComplete(mission, counts)) return { type: 'pay', mission };
  const replaced = replaceArchived(uid, mission, activities, previous);
  return replaced && { type: 'replace', mission, activities: replaced };
}
