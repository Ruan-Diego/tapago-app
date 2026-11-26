import { z } from 'zod';

import { activityKindSchema } from './ledger';
import { LIMITS } from './limits';
import { formatMoney } from './money';

/** Lê um valor digitado em reais ("18", "18,50", "1.000") e devolve centavos, ou `null`. */
export function parseReais(text: string): number | null {
  const trimmed = text.trim().replace(/^R\$\s*/, '');
  // Ponto só vale como separador de milhar ("1.000") ou, sozinho, como vírgula ("18.50").
  const normalized = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(trimmed)
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Centavos como texto de campo: 1800 → "18", 1850 → "18,50". */
export function reaisInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',');
}

const name = z
  .string()
  .trim()
  .min(1, 'Dê um nome.')
  .max(LIMITS.nameMax, `Use até ${LIMITS.nameMax} caracteres.`);

const value = z.string().transform((text, context) => {
  const cents = parseReais(text);
  if (cents === null || cents < LIMITS.valueMin || cents > LIMITS.valueMax) {
    context.addIssue({
      code: 'custom',
      message: `Use um valor entre ${formatMoney(LIMITS.valueMin)} e ${formatMoney(LIMITS.valueMax)}.`,
    });
    return z.NEVER;
  }
  return cents;
});

const minutes = z.string().transform((text, context) => {
  const number = /^\d+$/.test(text.trim()) ? Number(text.trim()) : 0;
  if (number < LIMITS.minutesMin || number > LIMITS.minutesMax) {
    context.addIssue({
      code: 'custom',
      message: `Use de ${LIMITS.minutesMin} a ${LIMITS.minutesMax} minutos.`,
    });
    return z.NEVER;
  }
  return number;
});

export const activityFormSchema = z.object({
  kind: activityKindSchema,
  name,
  description: z
    .string()
    .trim()
    .max(LIMITS.descriptionMax, `Use até ${LIMITS.descriptionMax} caracteres.`),
  value,
  minutes,
});

export const shopItemFormSchema = z.object({ name, value, minutes });

const weeklyGoal = z.string().transform((text, context) => {
  // Vazio ou zero: sem meta.
  const cents = text.trim() === '' ? 0 : parseReais(text);
  if (cents === null || cents > LIMITS.weeklyGoalMax) {
    context.addIssue({
      code: 'custom',
      message: `Use um valor até ${formatMoney(LIMITS.weeklyGoalMax)}, ou 0 para ficar sem meta.`,
    });
    return z.NEVER;
  }
  return cents;
});

/** Nome, frase e meta semanal (PROF-01, PROF-02). */
export const profileFormSchema = z.object({
  name,
  bio: z.string().trim().max(LIMITS.descriptionMax, `Use até ${LIMITS.descriptionMax} caracteres.`),
  weeklyGoal,
});

/** O que os campos guardam (texto) e o que sai validado (centavos e minutos). */
export type ActivityFormInput = z.input<typeof activityFormSchema>;
export type ActivityValues = z.output<typeof activityFormSchema>;
export type ShopItemFormInput = z.input<typeof shopItemFormSchema>;
export type ShopItemValues = z.output<typeof shopItemFormSchema>;
export type ProfileFormInput = z.input<typeof profileFormSchema>;
export type ProfileValues = z.output<typeof profileFormSchema>;
