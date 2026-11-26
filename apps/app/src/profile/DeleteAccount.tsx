import { DeleteAccountError, accountRepository, authRepository } from '@tapago/data';
import { Button, Card, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { clearAndroidSurfaces } from '@/platform/androidSurfaces';
import { confirm } from '@/platform/confirm';
import { reportError } from '@/platform/crashReports';
import { cancelScheduledNotifications } from '@/platform/notifications';

const OFFLINE = 'Precisa de internet. Tente de novo quando a conexão voltar.';

/** Limpa o aparelho depois de a conta deixar de existir. */
async function leaveDevice() {
  try {
    await authRepository.signOut();
  } catch (error) {
    console.warn('Não foi possível limpar o cache local.', error);
  }
}

/**
 * Excluir a conta (AUTH-05, P2): apaga os dados pelo próprio app, sem servidor, e depois o login.
 * Devolve a frase a mostrar, ou `null` quando a conta já foi e a tela vai trocar.
 */
async function deleteAccount(uid: string): Promise<string | null> {
  const proceed = await confirm({
    title: 'Excluir a conta para sempre?',
    message:
      'Apaga o saldo, as atividades, a loja, o inventário, as missões e todo o histórico desta conta, em todos os aparelhos, e também o login. Não dá para desfazer. Para guardar uma cópia, exporte o CSV antes.',
    confirmLabel: 'Excluir conta',
  });
  if (!proceed) return 'Nada foi apagado.';
  // Uma escrita deste aparelho que chegasse depois recriaria parte dos dados.
  if (await authRepository.hasPendingWrites(3000)) return OFFLINE;

  await cancelScheduledNotifications();
  clearAndroidSurfaces();
  try {
    await accountRepository.deleteAccount(uid);
  } catch (error) {
    if (error instanceof DeleteAccountError && error.step === 'login') {
      // Os dados já foram; o login precisa de uma entrada recente para ser apagado.
      if (error.code !== 'requires-recent-login') reportError('Falha ao apagar o login.', error);
      await confirm({
        title: 'Falta apagar o login',
        message:
          'Os dados da conta foram apagados. Para apagar também o login, entre de novo e toque em "Excluir conta".',
        confirmLabel: 'Entendi',
      });
      await leaveDevice();
      return null;
    }
    if (error instanceof DeleteAccountError && error.code === 'offline') return OFFLINE;
    reportError('Falha ao excluir a conta.', error);
    return 'A exclusão parou no meio. Toque de novo em "Excluir conta" para terminar.';
  }
  await leaveDevice();
  return null;
}

export function DeleteAccount({ uid, incomplete }: { uid: string; incomplete: boolean }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const message = await deleteAccount(uid);
      if (message) setResult(message);
    } catch (error) {
      reportError('Falha ao excluir a conta.', error);
      setResult('Não foi possível excluir a conta. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Excluir conta
      </Text>
      <Text style={styles.hint}>
        {incomplete
          ? 'A exclusão desta conta começou e não terminou. Toque abaixo para terminar.'
          : 'Apaga para sempre todos os dados desta conta e o login. Precisa de internet.'}
      </Text>
      <Button
        label={incomplete ? 'Terminar a exclusão' : 'Excluir conta'}
        variant="outline"
        loading={busy}
        onPress={() => void run()}
      />
      {result ? (
        <Text accessibilityLiveRegion="polite" role="status" style={styles.result}>
          {result}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.danger },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.graphite },
  result: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
});
