import { z } from 'zod';

import { LIMITS } from './limits';

/** Horário padrão do lembrete diário. */
export const DEFAULT_REMINDER_HOUR = 20;

export const userProfileSchema = z.object({
  name: z.string().max(60),
  bio: z.string().max(140),
  photoURL: z.string().nullable(),
  /** Centavos (R1). Pode ficar negativo só por atividades negativas (R3). */
  balance: z.number().int(),
  weeklyGoal: z.number().int().min(0),
  timezone: z.string().min(1),
  notif: z.object({
    end: z.boolean(),
    warn5: z.boolean(),
    weekly: z.boolean(),
    /** Lembrete diário opcional (F5), no horário `dailyHour` do aparelho. */
    daily: z.boolean().default(false),
    dailyHour: z.number().int().min(0).max(23).default(DEFAULT_REMINDER_HOUR),
  }),
  onboardingDone: z.boolean(),
  /** Exclusão da conta começada e não terminada (F5): libera apagar os dados. */
  deleting: z.boolean().optional(),
  /** Gravado pelo servidor na criação; usado em "No Tá pago desde…". */
  createdAt: z.date().optional().catch(undefined),
});

/** Documento users/{uid}/avatar/current: a foto fica fora do perfil para não pesar nele. */
export const avatarSchema = z.object({
  data: z.string().min(1).max(LIMITS.avatarMaxChars),
});

/** Documento `users/{uid}`. O `createdAt` é gravado pela camada de dados. */
export type UserProfile = z.infer<typeof userProfileSchema>;

export interface NewProfileInput {
  displayName: string | null;
  photoURL: string | null;
  timezone: string;
}

/** Iniciais para o avatar sem foto: primeira letra do primeiro e do último nome. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toLocaleUpperCase('pt-BR');
}

/** Documento criado no primeiro login. */
export function newUserProfile({ displayName, photoURL, timezone }: NewProfileInput): UserProfile {
  return {
    name: (displayName ?? '').trim().slice(0, 60),
    bio: '',
    photoURL,
    balance: 0,
    weeklyGoal: 0,
    timezone: timezone || 'America/Sao_Paulo',
    notif: {
      end: true,
      warn5: true,
      weekly: true,
      daily: false,
      dailyHour: DEFAULT_REMINDER_HOUR,
    },
    onboardingDone: false,
  };
}
