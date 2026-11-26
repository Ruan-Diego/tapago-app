import {
  formatDuration,
  formatMoney,
  goodMinutesPerLeisureHour,
  timeShares,
  type DailyTotals,
} from '@tapago/core';
import { Stripes, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

import { Block } from './Block';

/** "Para cada 1 h de lazer…" */
function leisureSentence({ posMin, leisureMin }: DailyTotals): string {
  const ratio = goodMinutesPerLeisureHour(posMin, leisureMin);
  return ratio === null
    ? 'Nenhum lazer usado neste período.'
    : `Para cada 1 h de lazer, você fez ${formatDuration(ratio)} de atividades boas.`;
}

function lossSentence({ lost, earned }: DailyTotals): string {
  if (lost <= 0) return 'Nenhum deslize no período. Bonito.';
  const share = earned > 0 ? ` — ${Math.round((lost / earned) * 100)}% do que você ganhou` : '';
  return `Deslizes custaram ${formatMoney(lost)}${share}.`;
}

/** Divisão do tempo: bom × lazer × ruim (HIST-03). */
export function TimeSplit({ totals }: { totals: DailyTotals }) {
  const shares = timeShares(totals);
  const parts = [
    { key: 'good', label: 'bom', share: shares.good, minutes: totals.posMin },
    { key: 'leisure', label: 'lazer', share: shares.leisure, minutes: totals.leisureMin },
    { key: 'bad', label: 'ruim', share: shares.bad, minutes: totals.negMin },
  ] as const;

  return (
    <Block title="Bom × lazer × ruim" note="tempo no período">
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={parts.map((part) => `${part.share}% ${part.label}`).join(', ')}
        style={styles.bar}
      >
        {parts.map((part) =>
          part.share === 0 ? null : part.key === 'bad' ? (
            <Stripes key={part.key} style={{ flexGrow: part.share, flexBasis: 0 }} />
          ) : (
            <View
              key={part.key}
              style={[styles[part.key], { flexGrow: part.share, flexBasis: 0 }]}
            />
          ),
        )}
      </View>
      <View style={styles.legend}>
        {parts.map((part) => (
          <Text key={part.key} style={styles.legendText}>
            <Text style={styles.share}>{part.share}%</Text> {part.label} ·{' '}
            {formatDuration(part.minutes)}
          </Text>
        ))}
      </View>
      <Text style={styles.sentence}>{leisureSentence(totals)}</Text>
      <Text style={styles.sentence}>{lossSentence(totals)}</Text>
    </Block>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 14,
    marginTop: 14,
    marginBottom: 10,
    gap: 3,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: colors.track,
  },
  good: { backgroundColor: colors.ink },
  leisure: { backgroundColor: colors.leisure },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  legendText: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.slate },
  share: { fontFamily: fonts.bodyBold, color: colors.ink },
  sentence: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    lineHeight: 20,
    color: colors.slate,
  },
});
