import { z } from 'zod';

const email = z.string().trim().pipe(z.email('Digite um e-mail válido.'));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Digite sua senha.'),
});

export const signUpSchema = z.object({
  email,
  password: z.string().min(6, 'A senha precisa de pelo menos 6 caracteres.'),
});

export const resetPasswordSchema = z.object({ email });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const GENERIC_MESSAGE = 'Não deu certo. Tente de novo em instantes.';

const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'Digite um e-mail válido.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
  'auth/weak-password': 'A senha precisa de pelo menos 6 caracteres.',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
  'auth/network-request-failed': 'Sem conexão. Verifique a internet e tente de novo.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups e tente de novo.',
  'auth/account-exists-with-different-credential':
    'Este e-mail já está cadastrado com outro método de login.',
  'auth/unauthorized-domain': 'Este endereço não está autorizado para login com Google.',
  'auth/google-not-configured': 'O login com Google ainda não está configurado neste app.',
  'auth/play-services': 'Atualize o Google Play Services para entrar com o Google.',
};

/** Códigos que significam "o usuário desistiu": não mostram erro. */
const SILENT_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

/** Mensagem em pt-BR para um erro de autenticação, ou `null` quando não há o que mostrar. */
export function authErrorMessage(error: unknown): string | null {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (SILENT_CODES.has(code)) return null;
  return AUTH_MESSAGES[code] ?? GENERIC_MESSAGE;
}
