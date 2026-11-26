import { describe, expect, it } from 'vitest';

import { formatDuration } from './duration';
import { activityFormSchema, parseReais, reaisInput, shopItemFormSchema } from './forms';

describe('parseReais (R1)', () => {
  it('converte para centavos', () => {
    expect(parseReais('18')).toBe(1800);
    expect(parseReais(' 18,5 ')).toBe(1850);
    expect(parseReais('18.50')).toBe(1850);
    expect(parseReais('R$ 1.000,25')).toBe(100_025);
    expect(parseReais('0,29')).toBe(29);
  });

  it('recusa texto que não é valor', () => {
    for (const text of ['', 'abc', '-3', '1,234', '1.0.0', '1e3']) {
      expect(parseReais(text), text).toBeNull();
    }
  });

  it('volta para o texto do campo', () => {
    expect(reaisInput(1800)).toBe('18');
    expect(reaisInput(1805)).toBe('18,05');
  });
});

describe('formulários', () => {
  const input = {
    kind: 'positive' as const,
    name: '  Louça ',
    description: '',
    value: '10',
    minutes: '15',
    streakStep: '10',
    isHabit: false,
    habitTarget: '',
    habitBonus: '',
  };

  it('devolve centavos e minutos', () => {
    expect(activityFormSchema.parse(input)).toEqual({
      kind: 'positive',
      name: 'Louça',
      description: '',
      value: 1000,
      minutes: 15,
      streakStep: 1000,
      habit: null,
    });
  });

  it('aceita aumento zero ou vazio (SEQ-01)', () => {
    for (const streakStep of ['0', '', ' ']) {
      expect(activityFormSchema.parse({ ...input, streakStep }).streakStep).toBe(0);
    }
    for (const streakStep of ['-1', 'abc', '10000,01']) {
      expect(activityFormSchema.safeParse({ ...input, streakStep }).success).toBe(false);
    }
  });

  it('exige vezes por dia e bônus no hábito (HAB-01)', () => {
    const marked = { ...input, isHabit: true, habitTarget: '3', habitBonus: '50' };
    expect(activityFormSchema.parse(marked).habit).toEqual({ target: 3, bonus: 5000 });
    for (const bad of [
      { habitTarget: '' },
      { habitTarget: '0' },
      { habitTarget: '21' },
      { habitTarget: '1,5' },
      { habitBonus: '' },
      { habitBonus: '0' },
      { habitBonus: '10000,01' },
    ]) {
      expect(activityFormSchema.safeParse({ ...marked, ...bad }).success).toBe(false);
    }
  });

  it('mostra todos os erros de uma vez', () => {
    const result = activityFormSchema.safeParse({
      ...input,
      name: '',
      value: '',
      isHabit: true,
      streakStep: 'x',
    });
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      'habitBonus',
      'habitTarget',
      'name',
      'streakStep',
      'value',
    ]);
  });

  it('ignora hábito e aumento na negativa', () => {
    const parsed = activityFormSchema.parse({
      ...input,
      kind: 'negative',
      streakStep: 'x',
      isHabit: true,
    });
    expect(parsed).toMatchObject({ streakStep: 0, habit: null });
  });

  it('aplica as faixas de nome, valor e minutos', () => {
    const base = { name: 'Filme', value: '20', minutes: '120' };
    expect(shopItemFormSchema.safeParse(base).success).toBe(true);
    for (const bad of [
      { name: '   ' },
      { name: 'x'.repeat(61) },
      { value: '0' },
      { value: '10000,01' },
      { minutes: '0' },
      { minutes: '1441' },
      { minutes: '1,5' },
    ]) {
      expect(shopItemFormSchema.safeParse({ ...base, ...bad }).success).toBe(false);
    }
  });
});

describe('formatDuration', () => {
  it('mostra horas e minutos', () => {
    expect(formatDuration(45)).toBe('45min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(90)).toBe('1h 30min');
    expect(formatDuration(0)).toBe('0min');
  });
});
