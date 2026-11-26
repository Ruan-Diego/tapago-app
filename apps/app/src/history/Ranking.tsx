import { Stripes, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

import { Block } from './Block';

export interface RankingBar {
  key: string;
  name: string;
  /** "1h 30min · 3×". */
  label: string;
  /** O que define o tamanho da barra, comparado com o primeiro. */
  amount: number;
}

interface RankingProps {
  title: string;
  note?: string;
  /** Já em ordem; `null` enquanto carrega. */
  rows: RankingBar[] | null;
  empty: string;
  tone: 'good' | 'leisure' | 'bad';
}

/** Ranking com barra e contagem (HIST-07). */
export function Ranking({ title, note, rows, empty, tone }: RankingProps) {
  const top = rows?.[0]?.amount || 1;

  return (
    <Block title={title} note={note} style={tone === 'bad' && styles.outlined}>
      {rows === null ? <Text style={styles.hint}>Carregando…</Text> : null}
      {rows?.length === 0 ? <Text style={styles.hint}>{empty}</Text> : null}
      {rows?.map((row) => {
        const width = `${Math.max(3, Math.round((row.amount / top) * 100))}%` as const;
        return (
          <View key={row.key} style={styles.row}>
            <View style={styles.head}>
              <Text numberOfLines={1} style={styles.name}>
                {row.name}
              </Text>
              <Text style={styles.label}>{row.label}</Text>
            </View>
            <View style={styles.track}>
              {tone === 'bad' ? (
                <Stripes style={[styles.fill, { width }]} />
              ) : (
                <View style={[styles.fill, styles[tone], { width }]} />
              )}
            </View>
          </View>
        );
      })}
    </Block>
  );
}

const styles = StyleSheet.create({
  outlined: { borderWidth: 1.5, borderColor: colors.ink },
  row: { marginTop: spacing.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.small,
    color: colors.ink,
  },
  label: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.graphite },
  track: {
    height: 8,
    marginTop: 6,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.track,
  },
  fill: { height: '100%', borderRadius: 4 },
  good: { backgroundColor: colors.ink },
  leisure: { backgroundColor: colors.graphite },
  hint: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    color: colors.graphite,
  },
});
