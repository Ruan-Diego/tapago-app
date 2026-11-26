import { csvFileName, dayKey, entriesToCsv } from '@tapago/core';
import { authRepository, entriesRepository } from '@tapago/data';
import { Button, Card, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { reportError } from '@/platform/crashReports';
import { exportTextFile } from '@/platform/exportFile';

const OFFLINE = 'Precisa de internet. Tente de novo quando a conexão voltar.';

async function exportEntries(uid: string, timeZone: string): Promise<string> {
  if (await authRepository.hasPendingWrites(3000)) return OFFLINE;
  const { entries, complete } = await entriesRepository.getAll(uid);
  if (!complete) return OFFLINE;
  if (entries.length === 0) return 'Ainda não há lançamentos para exportar.';
  await exportTextFile(
    csvFileName(dayKey(new Date(), timeZone)),
    entriesToCsv(entries, timeZone),
    'text/csv',
  );
  return entries.length === 1
    ? '1 lançamento exportado.'
    : `${entries.length} lançamentos exportados.`;
}

/** Exportar todos os lançamentos em CSV (PROF-03). */
export function ExportData({ uid, timeZone }: { uid: string; timeZone: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      setResult(await exportEntries(uid, timeZone));
    } catch (error) {
      reportError('Falha ao exportar o CSV.', error);
      setResult('Não foi possível exportar. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Exportar dados
      </Text>
      <Text style={styles.hint}>
        Todos os lançamentos em uma planilha (CSV): data, tipo, nome, valor e efeito no saldo. Lê o
        histórico inteiro.
      </Text>
      <Button label="Exportar CSV" variant="secondary" loading={busy} onPress={() => void run()} />
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
