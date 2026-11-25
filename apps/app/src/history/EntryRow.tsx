import { formatDuration, formatMoney, type Entry } from '@tapago/core';
import { colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

import { whenLabel } from './whenLabel';

type VisibleType = Exclude<Entry['type'], 'use'>;

const KINDS: Record<VisibleType, { sign: string; prefix: string; label: string }> = {
  earn: { sign: '+', prefix: '+', label: 'ganho' },
  loss: { sign: '↓', prefix: '−', label: 'perda' },
  purchase: { sign: '−', prefix: '−', label: 'compra' },
  reversal: { sign: '↺', prefix: '', label: 'estorno' },
};

interface EntryRowProps {
  entry: Entry;
  today: string;
  timeZone: string;
}

export function EntryRow({ entry, today, timeZone }: EntryRowProps) {
  if (entry.type === 'use') return null;
  const kind = KINDS[entry.type];

  return (
    <View style={styles.row}>
      <View
        accessibilityLabel={kind.label}
        style={[
          styles.icon,
          entry.type === 'earn' && styles.iconEarn,
          entry.type === 'purchase' && styles.iconPurchase,
        ]}
      >
        <Text style={[styles.sign, entry.type === 'purchase' && styles.signPurchase]}>
          {kind.sign}
        </Text>
      </View>
      <View style={styles.texts}>
        <Text numberOfLines={1} style={styles.name}>
          {entry.name}
        </Text>
        <Text style={styles.when}>
          {whenLabel(entry.at, today, timeZone)} · {formatDuration(entry.minutes)}
        </Text>
      </View>
      <Text style={styles.amount}>
        {kind.prefix}
        {formatMoney(entry.value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.track,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEarn: { backgroundColor: colors.accent },
  iconPurchase: { backgroundColor: colors.ink },
  sign: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink },
  signPurchase: { color: colors.white },
  texts: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
  when: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.graphite,
  },
  amount: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
});
