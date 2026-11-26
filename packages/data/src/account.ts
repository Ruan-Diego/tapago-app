/**
 * Excluir a conta (AUTH-05, P2) pelo próprio app, sem servidor: marca a conta, apaga os dados
 * coleção por coleção, apaga o documento do usuário e, por fim, o login.
 */
import { backend } from './backend';
import type { WriteOp } from './documents';
import { setClosingAccount } from './profile';
import { ACCOUNT_COLLECTIONS, ACCOUNT_SINGLE_DOCS, markDeletingOp, paths } from './writes';

/** Abaixo do limite de 500 operações por lote. */
const BATCH_SIZE = 400;

export type DeleteStep = 'data' | 'login';

/** O passo em que a exclusão parou, para a tela explicar o que falta. */
export class DeleteAccountError extends Error {
  constructor(
    readonly step: DeleteStep,
    readonly code: 'offline' | 'requires-recent-login' | 'failed',
    override readonly cause: unknown,
  ) {
    super(`Exclusão interrompida (${step}: ${code}).`);
  }
}

const codeOf = (error: unknown) => String((error as { code?: unknown }).code ?? '');

async function commitInBatches(ops: readonly WriteOp[]) {
  for (let start = 0; start < ops.length; start += BATCH_SIZE) {
    await backend.commit(ops.slice(start, start + BATCH_SIZE));
  }
}

/** Ids de toda a coleção, lidos do servidor. Sem internet, a lista poderia estar incompleta. */
async function serverPaths(collection: string, field: string): Promise<string[]> {
  const { docs, fromCache } = await backend.getQuery({
    path: collection,
    orderBy: { field, direction: 'asc' },
  });
  if (fromCache) throw new DeleteAccountError('data', 'offline', null);
  return docs.map(({ id }) => `${collection}/${id}`);
}

export const accountRepository = {
  /**
   * Apaga tudo. Precisa de internet: cada lote espera o servidor. Se o login não puder ser apagado
   * (login antigo demais), os dados já foram e o erro diz `login`: entrar de novo e repetir.
   */
  async deleteAccount(uid: string): Promise<void> {
    setClosingAccount(uid);
    try {
      try {
        await backend.commit([markDeletingOp(uid)]);
        const docs: string[] = [];
        for (const { path, field } of ACCOUNT_COLLECTIONS) {
          docs.push(...(await serverPaths(path(uid), field)));
        }
        for (const path of ACCOUNT_SINGLE_DOCS) {
          // Apagar um documento que não existe é recusado (sessão do timer): só os que existem.
          const { exists, fromCache } = await backend.getDoc(path(uid));
          if (fromCache) throw new DeleteAccountError('data', 'offline', null);
          if (exists) docs.push(path(uid));
        }
        await commitInBatches(docs.map((path) => ({ kind: 'delete', path })));
        // Por último: as regras conferem a marca neste documento para liberar os outros.
        await backend.commit([{ kind: 'delete', path: paths.user(uid) }]);
      } catch (error) {
        if (error instanceof DeleteAccountError) throw error;
        throw new DeleteAccountError('data', 'failed', error);
      }
      try {
        await backend.deleteCurrentUser();
      } catch (error) {
        const code = codeOf(error).endsWith('requires-recent-login')
          ? 'requires-recent-login'
          : 'failed';
        throw new DeleteAccountError('login', code, error);
      }
    } finally {
      setClosingAccount(null);
    }
  },
};
