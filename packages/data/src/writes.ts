/**
 * O que cada ação grava ("Como cada ação escreve", no PRD). Cada função devolve as operações de
 * um único lote: lançamento, saldo e agregado do dia entram juntos ou não entram.
 */
import {
  DAILY_FIELDS,
  MISSION_BONUS,
  dailyDelta,
  dayKey,
  entryFrom,
  entryTypeFor,
  habitBonusEntry,
  habitBonusId,
  missionBonusEntry,
  missionBonusId,
  newSession,
  nextCharge,
  nextStreak,
  type Activity,
  type ActivityValues,
  type EntryData,
  type EntrySource,
  type Habit,
  type InventoryItem,
  type Mission,
  type ProfileValues,
  type Session,
  type SessionChange,
  type ShopItem,
  type ShopItemValues,
  type UserProfile,
} from '@tapago/core';

import { DeleteField, Increment, type DocData, type WriteOp } from './documents';

export const paths = {
  user: (uid: string) => `users/${uid}`,
  activities: (uid: string) => `users/${uid}/activities`,
  shopItems: (uid: string) => `users/${uid}/shopItems`,
  entries: (uid: string) => `users/${uid}/entries`,
  inventory: (uid: string) => `users/${uid}/inventory`,
  daily: (uid: string) => `users/${uid}/daily`,
  missions: (uid: string) => `users/${uid}/missions`,
  /** Foto de perfil, fora do documento do usuário para não pesar nas leituras dele. */
  avatar: (uid: string) => `users/${uid}/avatar/current`,
  /** Documento único: no máximo uma sessão por conta (R5). */
  session: (uid: string) => `users/${uid}/state/session`,
};

export interface ActionContext {
  uid: string;
  at: Date;
  deviceId: string;
  /** Fuso do usuário: define em qual dia o lançamento conta. */
  timeZone: string;
}

function dailyOp(
  { uid, at, timeZone }: ActionContext,
  entry: EntryData,
  countRef?: string,
): WriteOp {
  const date = dayKey(at, timeZone);
  const delta = dailyDelta(entry);
  const data: DocData = { date };
  for (const field of DAILY_FIELDS) {
    const amount = delta[field];
    if (amount) data[field] = new Increment(amount);
  }
  if (countRef) data.counts = { [countRef]: new Increment(1) };
  // Só o de hábito: é como o app sabe que o dia daquela atividade já foi pago.
  if (entry.source === 'habit') data.bonuses = { [entry.refId]: new Increment(1) };
  return { kind: 'merge', path: `${paths.daily(uid)}/${date}`, data };
}

/**
 * Registrar atividade: lançamento + saldo + agregado do dia + sequência da positiva ou contagem
 * da negativa. O valor é o calculado agora (R14, R15), e o lançamento guarda o que o explica.
 */
export function registerActivityOps(
  context: ActionContext,
  activity: Activity,
  entryId: string,
): WriteOp[] {
  const { uid, at, deviceId, timeZone } = context;
  const today = dayKey(at, timeZone);
  const { value, level } = nextCharge(activity, today);
  const positive = activity.kind === 'positive';
  const entry: EntryData = {
    ...entryFrom(entryTypeFor(activity.kind), { ...activity, value }, at, deviceId),
    base: activity.value,
    level,
  };
  return [
    { kind: 'set', path: `${paths.entries(uid)}/${entryId}`, data: { ...entry } },
    {
      kind: 'update',
      path: paths.user(uid),
      data: { balance: new Increment(positive ? value : -value) },
    },
    dailyOp(context, entry, activity.id),
    {
      kind: 'update',
      path: `${paths.activities(uid)}/${activity.id}`,
      data: positive
        ? { streak: nextStreak(activity.streak, today) }
        : { penaltyCount: new Increment(1) },
    },
  ];
}

/** 1 ms depois do registro, para o bônus aparecer logo acima dele no histórico, sem trocar de dia. */
function bonusTime({ at, timeZone }: ActionContext): Date {
  const after = new Date(at.getTime() + 1);
  return dayKey(after, timeZone) === dayKey(at, timeZone) ? after : at;
}

/**
 * O bônus do hábito, em um lote próprio e com id fixo: se outro aparelho já pagou o dia, o
 * servidor recusa só este lote, e o registro fica.
 */
export function habitBonusOps(
  context: ActionContext,
  activity: Activity & { habit: Habit },
): WriteOp[] {
  const { uid, at, deviceId, timeZone } = context;
  const date = dayKey(at, timeZone);
  const bonusAt = bonusTime(context);
  const entry = habitBonusEntry(activity, bonusAt, deviceId);
  return [
    {
      kind: 'set',
      path: `${paths.entries(uid)}/${habitBonusId(activity.id, date)}`,
      data: { ...entry },
    },
    { kind: 'update', path: paths.user(uid), data: { balance: new Increment(entry.value) } },
    dailyOp({ ...context, at: bonusAt }, entry),
  ];
}

/**
 * Gravar a missão do dia, separada dos registros. Se outro aparelho gravou antes, o `set` conta
 * como mudar a missão, e o servidor recusa: a primeira vale para todos.
 */
export function createMissionOp(
  uid: string,
  date: string,
  activities: Mission['activities'],
  at: Date,
): WriteOp {
  return {
    kind: 'set',
    path: `${paths.missions(uid)}/${date}`,
    data: { date, activities, bonus: MISSION_BONUS, createdAt: at },
  };
}

/** Trocar a atividade arquivada de uma missão ainda não cumprida. */
export function replaceMissionOp(
  uid: string,
  date: string,
  activities: Mission['activities'],
): WriteOp {
  return { kind: 'update', path: `${paths.missions(uid)}/${date}`, data: { activities } };
}

/**
 * O bônus da missão, em lote próprio e com id fixo: lançamento + saldo + agregado do dia +
 * `completedAt`. O servidor recusa o lote se o dia já foi pago ou se o par não é o gravado.
 */
export function missionBonusOps(context: ActionContext, mission: Mission): WriteOp[] {
  const { uid, deviceId } = context;
  const at = bonusTime(context);
  const entry = missionBonusEntry(mission, at, deviceId);
  return [
    {
      kind: 'set',
      path: `${paths.entries(uid)}/${missionBonusId(mission.date)}`,
      data: { ...entry },
    },
    { kind: 'update', path: paths.user(uid), data: { balance: new Increment(entry.value) } },
    dailyOp({ ...context, at }, entry),
    { kind: 'update', path: `${paths.missions(uid)}/${mission.date}`, data: { completedAt: at } },
  ];
}

/** Zerar o custo de uma negativa: o próximo registro volta ao valor inicial (SEQ-04). */
export function resetPenaltyOp(uid: string, id: string): WriteOp {
  return { kind: 'update', path: `${paths.activities(uid)}/${id}`, data: { penaltyCount: 0 } };
}

/** Comprar e guardar: lançamento + saldo + agregado do dia + item no inventário. */
export function purchaseOps(
  context: ActionContext,
  item: ShopItem,
  ids: { entryId: string; inventoryId: string },
): WriteOp[] {
  const { uid, at, deviceId } = context;
  const entry = entryFrom('purchase', item, at, deviceId);
  return [
    { kind: 'set', path: `${paths.entries(uid)}/${ids.entryId}`, data: { ...entry } },
    { kind: 'update', path: paths.user(uid), data: { balance: new Increment(-item.value) } },
    dailyOp(context, entry),
    {
      kind: 'set',
      path: `${paths.inventory(uid)}/${ids.inventoryId}`,
      data: {
        shopItemId: item.id,
        name: item.name,
        value: item.value,
        minutes: item.minutes,
        purchaseEntryId: ids.entryId,
        purchasedAt: at,
      },
    },
  ];
}

export interface SessionIds {
  sessionId: string;
  useEntryId: string;
}

/**
 * Começar um uso: lançamento `use` + sessão. O tempo de lazer só entra no agregado do dia quando a
 * sessão acaba, com os minutos realmente usados (R9).
 */
function startSessionOps(
  { uid, at, deviceId }: ActionContext,
  source: EntrySource,
  { sessionId, useEntryId }: SessionIds,
): WriteOp[] {
  const entry = entryFrom('use', source, at, deviceId);
  const session = newSession({
    id: sessionId,
    itemName: source.name,
    minutes: source.minutes,
    useEntryId,
    deviceId,
    at,
  });
  return [
    { kind: 'set', path: `${paths.entries(uid)}/${useEntryId}`, data: { ...entry } },
    { kind: 'set', path: paths.session(uid), data: { ...session } },
  ];
}

/** Comprar e usar agora (R4): a compra e o começo do uso em um só lote. */
export function purchaseAndUseOps(
  context: ActionContext,
  item: ShopItem,
  ids: SessionIds & { entryId: string },
): WriteOp[] {
  const { uid, at, deviceId } = context;
  const entry = entryFrom('purchase', item, at, deviceId);
  return [
    { kind: 'set', path: `${paths.entries(uid)}/${ids.entryId}`, data: { ...entry } },
    { kind: 'update', path: paths.user(uid), data: { balance: new Increment(-item.value) } },
    dailyOp(context, entry),
    ...startSessionOps(context, item, ids),
  ];
}

/** Começar um item guardado: o timer começa e o item sai do inventário (INV-02). */
export function startStoredOps(
  context: ActionContext,
  stored: InventoryItem,
  ids: SessionIds,
): WriteOp[] {
  const { shopItemId, name, value, minutes } = stored;
  return [
    ...startSessionOps(context, { id: shopItemId, name, value, minutes }, ids),
    { kind: 'delete', path: `${paths.inventory(context.uid)}/${stored.id}` },
  ];
}

/**
 * Pausar ou retomar. O `id` vai junto para as regras recusarem a mudança de um aparelho
 * desatualizado sobre outra sessão.
 */
export function changeSessionOp(uid: string, session: Session, change: SessionChange): WriteOp {
  return { kind: 'update', path: paths.session(uid), data: { id: session.id, ...change } };
}

/**
 * Encerrar: minutos usados no lançamento + tempo de lazer no dia em que o uso começou + sessão
 * apagada. As regras só aceitam o lote enquanto esta é a sessão atual, então dois aparelhos não
 * contam o mesmo uso duas vezes.
 */
export function finishSessionOps(
  uid: string,
  session: Session,
  minutes: number,
  timeZone: string,
): WriteOp[] {
  const date = dayKey(session.startedAt, timeZone);
  return [
    { kind: 'update', path: `${paths.entries(uid)}/${session.useEntryId}`, data: { minutes } },
    {
      kind: 'merge',
      path: `${paths.daily(uid)}/${date}`,
      data: { date, leisureMin: new Increment(minutes) },
    },
    { kind: 'delete', path: paths.session(uid) },
  ];
}

/** `order` é o horário de criação: o item novo entra no fim da lista. */
export function createActivityOp(
  uid: string,
  id: string,
  values: ActivityValues,
  at: Date,
): WriteOp {
  const { kind, name, description, value, minutes, streakStep, habit } = values;
  const data: DocData = {
    kind,
    name,
    description,
    value,
    minutes,
    order: at.getTime(),
    archived: false,
    createdAt: at,
  };
  // Negativa não tem aumento nem hábito.
  if (kind === 'positive') {
    data.streakStep = streakStep;
    if (habit) data.habit = habit;
  }
  return { kind: 'set', path: `${paths.activities(uid)}/${id}`, data };
}

/**
 * O tipo (+/−) é escolhido na criação e não muda depois. A sequência e a contagem da negativa
 * não são do formulário: só o registro e o zeramento mexem nelas.
 */
export function updateActivityOp(uid: string, id: string, values: ActivityValues): WriteOp {
  const { kind, name, description, value, minutes, streakStep, habit } = values;
  const data: DocData = { name, description, value, minutes };
  if (kind === 'positive') {
    data.streakStep = streakStep;
    data.habit = habit ?? new DeleteField();
  }
  return { kind: 'update', path: `${paths.activities(uid)}/${id}`, data };
}

export function createShopItemOp(
  uid: string,
  id: string,
  values: ShopItemValues,
  at: Date,
): WriteOp {
  const { name, value, minutes } = values;
  return {
    kind: 'set',
    path: `${paths.shopItems(uid)}/${id}`,
    data: { name, value, minutes, order: at.getTime(), archived: false, createdAt: at },
  };
}

export function updateShopItemOp(uid: string, id: string, values: ShopItemValues): WriteOp {
  const { name, value, minutes } = values;
  return {
    kind: 'update',
    path: `${paths.shopItems(uid)}/${id}`,
    data: { name, value, minutes },
  };
}

/** O que o usuário muda no perfil. O saldo nunca entra aqui: ele só muda com lançamentos. */
export type ProfilePatch = Partial<ProfileValues & Pick<UserProfile, 'notif' | 'onboardingDone'>>;

export function updateProfileOp(uid: string, patch: ProfilePatch): WriteOp {
  return { kind: 'update', path: paths.user(uid), data: { ...patch } };
}

export function avatarOp(uid: string, data: string, at: Date): WriteOp {
  return { kind: 'set', path: paths.avatar(uid), data: { data, updatedAt: at } };
}

export interface OnboardingData {
  /** Ausente quando a conta já estava configurada e só falta marcar o onboarding. */
  profile?: { name: string; notif: UserProfile['notif'] };
  activities?: readonly { id: string; values: ActivityValues }[];
  shopItems?: readonly { id: string; values: ShopItemValues }[];
  /** JPEG em base64. */
  avatar?: string | null;
}

/**
 * Tudo o que o onboarding escolheu, em um lote só: a conta nunca fica configurada pela metade.
 * A ordem das listas é a ordem em que aparecem na tela.
 */
export function onboardingOps(uid: string, data: OnboardingData, at: Date): WriteOp[] {
  const later = (index: number) => new Date(at.getTime() + index);
  return [
    updateProfileOp(uid, { ...data.profile, onboardingDone: true }),
    ...(data.activities ?? []).map(({ id, values }, index) =>
      createActivityOp(uid, id, values, later(index)),
    ),
    ...(data.shopItems ?? []).map(({ id, values }, index) =>
      createShopItemOp(uid, id, values, later(index)),
    ),
    ...(data.avatar ? [avatarOp(uid, data.avatar, at)] : []),
  ];
}

/** Arquivar em vez de apagar (R10). */
export function archiveOp(collectionPath: string, id: string): WriteOp {
  return { kind: 'update', path: `${collectionPath}/${id}`, data: { archived: true } };
}
