import { formatMoney } from '@tapago/core';
import { colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/profile/Avatar';

interface DoneStepProps {
  name: string;
  photo: string | null;
  /** "3 boas · 2 ruins" e afins. */
  chips: readonly string[];
  /** O lazer mais barato: o primeiro objetivo. */
  goal: { name: string; value: number } | null;
}

export function DoneStep({ name, photo, chips, goal }: DoneStepProps) {
  const firstName = name.trim().split(/\s+/)[0] || 'você';

  return (
    <View style={styles.wrapper}>
      <Avatar size={88} preview={{ photo, name }} />
      <Text accessibilityRole="header" style={styles.title}>
        {`Tudo pronto,\n${firstName}.`}
      </Text>
      <View style={styles.chips}>
        {chips.map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText}>{chip}</Text>
          </View>
        ))}
      </View>
      {goal ? (
        <View style={styles.goal}>
          <Text style={styles.goalCaption}>Seu primeiro objetivo</Text>
          <Text style={styles.goalText}>
            Ganhe <Text style={styles.goalValue}>{formatMoney(goal.value)}</Text> pra comprar{' '}
            <Text style={styles.goalName}>{goal.name}</Text>.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexGrow: 1, justifyContent: 'center', gap: spacing.xl },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -2,
    color: colors.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
  },
  chipText: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
  goal: { backgroundColor: colors.ink, borderRadius: radii.xl, padding: 18, gap: 6 },
  goalCaption: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.onInkMuted,
  },
  goalText: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.white },
  goalValue: { fontFamily: fonts.bodyBold, color: colors.accent },
  goalName: { fontFamily: fonts.bodyBold },
});
