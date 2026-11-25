import { authErrorMessage } from '@tapago/core';
import { useState } from 'react';

/** Executa uma ação de autenticação cuidando do estado de carregamento e da mensagem de erro. */
export function useAuthAction() {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(name: string, action: () => Promise<void>): Promise<boolean> {
    setPending(name);
    setError(null);
    try {
      await action();
      return true;
    } catch (cause) {
      console.warn('Falha de autenticação.', cause);
      setError(authErrorMessage(cause));
      return false;
    } finally {
      setPending(null);
    }
  }

  return { pending, error, run };
}
