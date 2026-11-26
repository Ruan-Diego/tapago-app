import { bestStreak, formatDuration, formatMoney, sumDailies, type Daily } from '@tapago/core';
import { colors, fonts, radii, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

/** Os números de toda a conta: ganhos, tempo bom e recorde de dias seguidos. */
export function ProfileStats({ dailies }: { dailies: Daily[] | null }) {
  const totals = sumDailies(dailies ?? [], '0000-00-00', '9999-99-99');
  const record = bestStreak(dailies ?? []);
  const stats = [
    { label: 'ganhos no total', value: formatMoney(totals.earned) },
    { label: 'em atividades boas', value: formatDuration(totals.posMin) },
    { label: 'recorde seguido', value: `${record} ${record === 1 ? 'dia' : 'dias'}` },
  ];

  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.stat}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
            {dailies === null ? '—' : stat.value}
          </Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
  },
  value: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink },
  label: {
    marginTop: 2,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.graphite,
  },
});
