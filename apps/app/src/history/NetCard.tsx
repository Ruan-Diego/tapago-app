import { formatMoney, type DailyTotals } from '@tapago/core';
import { colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

/** Saldo líquido do período, no painel da web. */
export function NetCard({ totals, style }: { totals: DailyTotals; style?: StyleProp<ViewStyle> }) {
  const net = totals.earned - totals.lost - totals.spent;

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.caption}>Saldo líquido do período</Text>
      <Text style={styles.value}>
        {net > 0 ? '+' : ''}
        {formatMoney(net)}
      </Text>
      <Text style={styles.text}>
        {formatMoney(totals.earned)} ganhos − {formatMoney(totals.lost)} perdidos −{' '}
        {formatMoney(totals.spent)} gastos em lazer.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    gap: spacing.lg,
    justifyContent: 'space-between',
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
  },
  caption: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.onInkMuted,
  },
  value: { fontFamily: fonts.displayBold, fontSize: 56, letterSpacing: -2, color: colors.accent },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    lineHeight: 21,
    color: colors.onInkMuted,
  },
});
