import { balanceFromEntries, formatMoney } from '@tapago/core';
import { authRepository, entriesRepository, profileRepository } from '@tapago/data';
import { Button, Card, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { save } from '@/ledger/actions';
import { confirm } from '@/platform/confirm';
import { reportError } from '@/platform/crashReports';
import { useSession } from '@/session/store';

/** Quanto esperar as escritas deste aparelho chegarem ao servidor. */
const SYNC_TIMEOUT_MS = 3000;

const OFFLINE = 'Precisa de internet. Tente de novo quando a conexão voltar.';

/**
 * Compara o saldo com a soma de todos os lançamentos e corrige com a confirmação do usuário.
 * Devolve a frase a mostrar.
 */
async function checkBalance(uid: string): Promise<string> {
  if (await authRepository.hasPendingWrites(SYNC_TIMEOUT_MS)) return OFFLINE;
  const balance = () => useSession.getState().profile?.balance;
  const before = balance();
  const { entries, complete } = await entriesRepository.getAll(uid);
  if (!complete) return OFFLINE;
  // O saldo mudou durante a leitura: a comparação não valeria.
  if (before === undefined || balance() !== before) {
    return 'O saldo mudou durante a conferência. Tente de novo.';
  }
  const expected = balanceFromEntries(entries);
  if (expected === before) return `Saldo conferido: ${formatMoney(before)}. Está certo.`;

  const proceed = await confirm({
    title: 'O saldo não confere',
    message: `O saldo é ${formatMoney(before)}, mas os lançamentos somam ${formatMoney(expected)}. Corrigir para ${formatMoney(expected)}?`,
    confirmLabel: 'Corrigir saldo',
  });
  if (!proceed) return 'O saldo não foi alterado.';
  save(profileRepository.fixBalance(uid, expected - before));
  return `Saldo corrigido para ${formatMoney(expected)}.`;
}

/** Proteção contra um saldo corrompido: recalcular a partir do livro-caixa. */
export function BalanceCheck({ uid }: { uid: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      setResult(await checkBalance(uid));
    } catch (error) {
      reportError('Falha ao conferir o saldo.', error);
      setResult('Não foi possível conferir o saldo. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Conferir saldo
      </Text>
      <Text style={styles.hint}>
        Soma todos os lançamentos da conta e compara com o saldo. Lê o histórico inteiro: use só se
        o saldo parecer errado.
      </Text>
      <Button label="Conferir" variant="secondary" loading={busy} onPress={() => void run()} />
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
  title: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.graphite },
  result: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
});
