import { formatMoney, type Activity, type Daily, type Mission } from '@tapago/core';
import { Pop, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

interface MissionCardProps {
  mission: Mission;
  activities: readonly Activity[];
  /** Registros de hoje por atividade. */
  counts: Daily['counts'];
}

/** A missão do dia: as 2 atividades, o que já foi feito e o bônus (MIS-02). */
export function MissionCard({ mission, activities, counts }: MissionCardProps) {
  const complete = mission.completedAt !== undefined;
  const items = mission.activities.map(({ id, name }) => ({
    id,
    // O nome atual, se a atividade foi renomeada depois do sorteio.
    name: activities.find((activity) => activity.id === id)?.name ?? name,
    done: complete || (counts[id] ?? 0) > 0,
  }));
  const done = items.filter((item) => item.done).length;

  return (
    <Pop trigger={complete} style={[styles.card, complete && styles.complete]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, complete && styles.onAccent]}>
          Missão do dia
        </Text>
        <Text style={[styles.bonus, complete && styles.bonusComplete]}>
          +{formatMoney(mission.bonus)}
        </Text>
      </View>
      {items.map((item) => (
        <View
          key={item.id}
          accessible
          accessibilityLabel={`${item.name}: ${item.done ? 'feita' : 'falta fazer'}`}
          style={styles.item}
        >
          <Pop trigger={item.done}>
            <View
              style={[
                styles.check,
                item.done && styles.checkDone,
                complete && styles.checkComplete,
              ]}
            >
              {item.done ? (
                <Text style={[styles.mark, complete && styles.markComplete]}>✓</Text>
              ) : null}
            </View>
          </Pop>
          <Text style={[styles.name, complete && styles.onAccent]}>{item.name}</Text>
        </View>
      ))}
      <Text style={[styles.status, complete && styles.onAccent]}>
        {complete
          ? 'Cumprida. Bônus pago.'
          : `${done} de ${items.length} · faça as duas hoje para ganhar o bônus`}
      </Text>
    </Pop>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.ink,
  },
  complete: { backgroundColor: colors.accent },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  bonus: {
    overflow: 'hidden',
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accent,
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink,
  },
  bonusComplete: { backgroundColor: colors.ink, color: colors.accent },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  check: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.onInkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { borderColor: colors.accent, backgroundColor: colors.accent },
  checkComplete: { borderColor: colors.ink, backgroundColor: colors.ink },
  mark: { fontFamily: fonts.bodyBold, fontSize: fontSizes.small, color: colors.ink },
  markComplete: { color: colors.accent },
  name: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.white },
  status: { fontFamily: fonts.body, fontSize: fontSizes.caption, color: colors.onInkMuted },
  onAccent: { color: colors.ink },
});
