import { describe, expect, it } from 'vitest';

import { authErrorMessage, signInSchema, signUpSchema } from './auth';

describe('esquemas de autenticação', () => {
  it('apara espaços do e-mail', () => {
    const parsed = signInSchema.parse({ email: ' ana@exemplo.com ', password: 'x' });
    expect(parsed.email).toBe('ana@exemplo.com');
  });

  it('exige senha de 6 caracteres só no cadastro', () => {
    const input = { email: 'ana@exemplo.com', password: '12345' };
    expect(signUpSchema.safeParse(input).success).toBe(false);
    expect(signInSchema.safeParse(input).success).toBe(true);
  });

  it('rejeita e-mail inválido', () => {
    expect(signInSchema.safeParse({ email: 'ana', password: 'x' }).success).toBe(false);
  });
});

describe('authErrorMessage', () => {
  it('traduz códigos conhecidos', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe(
      'E-mail ou senha incorretos.',
    );
  });

  it('fica em silêncio quando o usuário fecha a janela do Google', () => {
    expect(authErrorMessage({ code: 'auth/popup-closed-by-user' })).toBeNull();
  });

  it('tem mensagem genérica para o resto', () => {
    expect(authErrorMessage(new Error('x'))).toBe('Não deu certo. Tente de novo em instantes.');
  });
});
