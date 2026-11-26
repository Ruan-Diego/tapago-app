import { formatDuration, formatMoney, type Entry } from '@tapago/core';
import { colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

import { whenLabel } from './whenLabel';

type VisibleType = Exclude<Entry['type'], 'use' | 'reversal'>;

const KINDS: Record<VisibleType, { sign: string; prefix: string; label: string }> = {
  earn: { sign: '+', prefix: '+', label: 'ganho' },
  loss: { sign: '↓', prefix: '−', label: 'perda' },
  purchase: { sign: '−', prefix: '−', label: 'compra' },
  bonus: { sign: '★', prefix: '+', label: 'bônus' },
};

const BONUS_TITLES: Record<NonNullable<Entry['source']>, string> = {
  habit: 'Bônus de hábito completo',
  mission: 'Bônus da missão do dia',
};

/** O estorno vale o inverso do lançamento desfeito (R8). */
const REVERSAL = { sign: '↺', label: 'estorno' };

/** O que explica um valor diferente do inicial (R14, R15), ou `null`. */
function levelNote({ type, value, base, level }: Entry): string | null {
  if (base === undefined || level === undefined || value === base) return null;
  return type === 'earn' ? `${level}º dia de sequência` : `${level}º desde o zeramento`;
}

interface EntryRowProps {
  entry: Entry;
  today: string;
  timeZone: string;
  /** O lançamento foi desfeito. */
  undone?: boolean;
}

export function EntryRow({ entry, today, timeZone, undone = false }: EntryRowProps) {
  if (entry.type === 'use') return null;
  const kind =
    entry.type === 'reversal'
      ? { ...REVERSAL, prefix: entry.reversedType === 'loss' ? '+' : '−' }
      : KINDS[entry.type];
  // O bônus é identificado pelo título; a atividade vai na linha de baixo (HAB-03).
  const bonus = entry.source ? BONUS_TITLES[entry.source] : null;
  const when = whenLabel(entry.at, today, timeZone);
  const habit = entry.target ? ` (${entry.target} de ${entry.target} no dia)` : '';
  // No bônus da missão, as atividades que a cumpriram (MIS-04).
  const subject = entry.activities?.map(({ name }) => name).join(' + ') ?? entry.name;
  const reversal = entry.type === 'reversal';
  const ofBonus = entry.reversedType === 'bonus';
  const title = reversal ? `Desfeito · ${ofBonus ? 'bônus' : entry.name}` : (bonus ?? entry.name);
  const parts = reversal
    ? [ofBonus ? entry.name : null, when]
    : bonus
      ? [`${subject}${habit}`, when]
      : [when, formatDuration(entry.minutes), levelNote(entry)];
  const detail = [...parts, undone ? 'desfeito' : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.row}>
      <View
        accessibilityLabel={kind.label}
        style={[
          styles.icon,
          entry.type === 'earn' && styles.iconEarn,
          entry.type === 'purchase' && styles.iconPurchase,
          entry.type === 'bonus' && styles.iconBonus,
        ]}
      >
        <Text
          style={[
            styles.sign,
            entry.type === 'purchase' && styles.signPurchase,
            entry.type === 'bonus' && styles.signBonus,
          ]}
        >
          {kind.sign}
        </Text>
      </View>
      <View style={styles.texts}>
        <Text numberOfLines={bonus ? 2 : 1} style={[styles.name, undone && styles.undone]}>
          {title}
        </Text>
        <Text style={styles.when}>{detail}</Text>
      </View>
      <Text style={[styles.amount, undone && styles.undone]}>
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
  iconBonus: { backgroundColor: colors.ink },
  signBonus: { color: colors.accent },
  texts: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
  when: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.graphite,
  },
  amount: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  undone: { textDecorationLine: 'line-through', color: colors.graphite },
});
