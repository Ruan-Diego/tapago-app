import {
  aliveStreak,
  formatDuration,
  formatMoney,
  habitProgress,
  nextCharge,
  type Activity,
} from '@tapago/core';
import {
  PillButton,
  Pop,
  PressableScale,
  ProgressBar,
  colors,
  fonts,
  fontSizes,
  radii,
  spacing,
} from '@tapago/ui';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { plural } from '@/history/format';

interface ActivityCardProps {
  activity: Activity;
  /** Posição na lista, como "01" ou "−02". */
  number: string;
  /** O dia de hoje no fuso do usuário, para o valor da sequência. */
  today: string;
  /** Quantas vezes foi registrada hoje. */
  todayCount: number;
  disabled: boolean;
  onRegister: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onResetPenalty: (activity: Activity) => void;
}

/** Negativas se diferenciam pela forma: borda tracejada, botão de contorno e "−" (ACT-04). */
export const ActivityCard = memo(function ActivityCard({
  activity,
  number,
  today,
  todayCount,
  disabled,
  onRegister,
  onEdit,
  onResetPenalty,
}: ActivityCardProps) {
  const negative = activity.kind === 'negative';
  // O que o próximo toque vai pagar ou cobrar (SEQ-02).
  const { value } = nextCharge(activity, today);
  const amount = `${negative ? '−' : '+'}${formatMoney(value)}`;
  const done = todayCount > 0;
  const todayLabel = negative
    ? `${todayCount}× hoje`
    : todayCount === 1
      ? 'feito hoje'
      : `feito ${todayCount}× hoje`;
  const habit = habitProgress(activity, todayCount);
  const habitLabel =
    habit &&
    (!habit.complete
      ? `${habit.done} de ${habit.target} hoje`
      : todayCount > habit.target
        ? `completo · ${todayCount}× hoje`
        : `completo · ${habit.done} de ${habit.target}`);
  const streak = negative ? 0 : aliveStreak(activity.streak, today);

  return (
    <View style={[styles.card, negative && styles.negative, done && styles.done]}>
      <View style={styles.main}>
        <PressableScale
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
            {habit ? (
              <Pop trigger={habit.complete}>
                <Text
                  style={[styles.chip, styles.chipMuted, habit.complete && styles.chipComplete]}
                >
                  {habitLabel}
                </Text>
              </Pop>
            ) : done ? (
              <Pop trigger={todayCount}>
                <Text style={[styles.chip, negative && styles.chipMuted]}>{todayLabel}</Text>
              </Pop>
            ) : null}
            {streak > 0 ? (
              <Pop trigger={streak}>
                <Text style={styles.streak}>{plural(streak, 'dia', 'dias')} de sequência</Text>
              </Pop>
            ) : null}
          </View>
          {habit ? (
            <ProgressBar
              label="Hábito de hoje"
              value={habit.done}
              max={habit.target}
              style={styles.track}
            />
          ) : null}
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={
            negative
              ? `Registrar ${activity.name} e perder ${formatMoney(value)}`
              : `Concluir ${activity.name} e ganhar ${formatMoney(value)}`
          }
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onRegister(activity)}
          style={[styles.button, negative && styles.buttonNegative, disabled && styles.inactive]}
        >
          <Text style={[styles.amount, negative && styles.amountNegative]}>{amount}</Text>
        </PressableScale>
      </View>
      {negative && activity.penaltyCount > 0 ? (
        <View style={styles.penalty}>
          <Text style={styles.penaltyText}>
            {plural(activity.penaltyCount, 'registro', 'registros')} desde o zeramento
          </Text>
          <PillButton
            label="Zerar custo"
            accessibilityLabel={`Zerar o custo de ${activity.name}`}
            onPress={() => onResetPenalty(activity)}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: 14,
    paddingLeft: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  negative: { borderStyle: 'dashed', borderColor: colors.graphite, backgroundColor: 'transparent' },
  done: { borderColor: colors.ink },
  main: { flexDirection: 'row', alignItems: 'center', gap: 14 },
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
  chipMuted: { backgroundColor: colors.track },
  chipComplete: { backgroundColor: colors.accent },
  streak: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.caption, color: colors.ink },
  track: { height: 6, marginTop: spacing.sm },
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
  inactive: { opacity: 0.6 },
  amount: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
  amountNegative: { color: colors.ink },
  penalty: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  penaltyText: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.ink,
  },
});
