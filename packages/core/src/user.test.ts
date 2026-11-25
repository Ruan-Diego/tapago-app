import { describe, expect, it } from 'vitest';

import { initials, newUserProfile, userProfileSchema } from './user';

describe('initials', () => {
  it('usa o primeiro e o último nome', () => {
    expect(initials('ana maria souza')).toBe('AS');
    expect(initials('  Rafa ')).toBe('R');
    expect(initials('')).toBe('');
  });
});

describe('newUserProfile', () => {
  it('começa com saldo zero e onboarding pendente', () => {
    const profile = newUserProfile({
      displayName: '  Ana  ',
      photoURL: null,
      timezone: 'America/Bahia',
    });
    expect(profile).toMatchObject({
      name: 'Ana',
      balance: 0,
      onboardingDone: false,
      timezone: 'America/Bahia',
    });
    expect(userProfileSchema.parse(profile)).toEqual(profile);
  });

  it('aceita conta sem nome e usa um fuso padrão', () => {
    const profile = newUserProfile({ displayName: null, photoURL: null, timezone: '' });
    expect(profile).toMatchObject({ name: '', timezone: 'America/Sao_Paulo' });
  });

  it('corta nomes longos em 60 caracteres', () => {
    const profile = newUserProfile({
      displayName: 'x'.repeat(80),
      photoURL: null,
      timezone: 'UTC',
    });
    expect(profile.name).toHaveLength(60);
  });
});
