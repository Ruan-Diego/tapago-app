import { formatDuration, formatMoney, type Activity } from '@tapago/core';
import { colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ActivityCardProps {
  activity: Activity;
  /** Posição na lista, como "01" ou "−02". */
  number: string;
  /** Quantas vezes foi registrada hoje. */
  todayCount: number;
  disabled: boolean;
  onRegister: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
}

/** Negativas se diferenciam pela forma: borda tracejada, botão de contorno e "−" (ACT-04). */
export const ActivityCard = memo(function ActivityCard({
  activity,
  number,
  todayCount,
  disabled,
  onRegister,
  onEdit,
}: ActivityCardProps) {
  const negative = activity.kind === 'negative';
  const amount = `${negative ? '−' : '+'}${formatMoney(activity.value)}`;
  const done = todayCount > 0;
  const todayLabel = negative
    ? `${todayCount}× hoje`
    : todayCount === 1
      ? 'feito hoje'
      : `feito ${todayCount}× hoje`;

  return (
    <View style={[styles.card, negative && styles.negative, done && styles.done]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${activity.name}`}
        onPress={() => onEdit(activity)}
        style={styles.body}
      >
        <View style={styles.heading}>
          <Text style={styles.number}>{number}</Text>
          <Text style={styles.name}>{activity.name}</Text>
        </View>
        {activity.description ? (
          <Text style={styles.description}>{activity.description}</Text>
        ) : null}
        <View style={styles.meta}>
          <Text style={styles.duration}>
            {negative ? 'tempo perdido ≈ ' : '≈ '}
            {formatDuration(activity.minutes)}
          </Text>
          {done ? (
            <Text style={[styles.chip, negative && styles.chipNegative]}>{todayLabel}</Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          negative
            ? `Registrar ${activity.name} e perder ${formatMoney(activity.value)}`
            : `Concluir ${activity.name} e ganhar ${formatMoney(activity.value)}`
        }
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onRegister(activity)}
        style={({ pressed }) => [
          styles.button,
          negative && styles.buttonNegative,
          (pressed || disabled) && styles.pressed,
        ]}
      >
        <Text style={[styles.amount, negative && styles.amountNegative]}>{amount}</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingLeft: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  negative: { borderStyle: 'dashed', borderColor: colors.graphite, backgroundColor: 'transparent' },
  done: { borderColor: colors.ink },
  body: { flex: 1, minWidth: 0, minHeight: 56, justifyContent: 'center' },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  number: { fontFamily: fonts.mono, fontSize: 11, color: colors.graphite },
  name: { flexShrink: 1, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.ink },
  description: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    color: colors.graphite,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.sm,
  },
  duration: { fontFamily: fonts.body, fontSize: fontSizes.caption, color: colors.slate },
  chip: {
    overflow: 'hidden',
    borderRadius: radii.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.accent,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.ink,
  },
  chipNegative: { backgroundColor: colors.track },
  button: {
    minWidth: 84,
    height: 56,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonNegative: { backgroundColor: colors.white },
  pressed: { opacity: 0.6 },
  amount: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
  amountNegative: { color: colors.ink },
});
