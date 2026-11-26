import {
  activeInOrder,
  emptyDaily,
  formatMoney,
  weeklyProgress,
  type Activity,
  type ActivityKind,
} from '@tapago/core';
import {
  Button,
  Card,
  Money,
  PillButton,
  SIDEBAR_BREAKPOINT,
  colors,
  fonts,
  fontSizes,
  radii,
  spacing,
} from '@tapago/ui';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ActivityCard } from '@/activities/ActivityCard';
import { ActivitySheet } from '@/activities/ActivitySheet';
import { registerActivity, resetPenalty } from '@/ledger/actions';
import { useLedger } from '@/ledger/store';
import { useToday } from '@/ledger/useToday';
import { Screen } from '@/navigation/Screen';
import { useDisplayName } from '@/profile/useDisplayName';
import { useSession } from '@/session/store';

const SECTIONS: { kind: ActivityKind; title: string; hint: string; empty: string }[] = [
  {
    kind: 'positive',
    title: '+ Ganham dinheiro',
    hint: 'toque quando fizer',
    empty: 'Nenhuma atividade positiva ainda.',
  },
  {
    kind: 'negative',
    title: '− Custam dinheiro',
    hint: 'registre quando acontecer',
    empty: 'Nenhuma atividade negativa ainda.',
  },
];

function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  return hour < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Activities() {
  const wide = useWindowDimensions().width >= SIDEBAR_BREAKPOINT;
  const uid = useSession((state) => state.user?.uid);
  const profile = useSession((state) => state.profile);
  const activities = useLedger((state) => state.activities);
  const dailies = useLedger((state) => state.dailies);
  const today = useToday();
  const firstName = useDisplayName().split(/\s+/)[0];
  /** `'new'` ao criar; a atividade ao editar. */
  const [editing, setEditing] = useState<Activity | 'new' | null>(null);

  const todayTotals = dailies?.find((daily) => daily.date === today) ?? emptyDaily(today);
  const week = weeklyProgress(dailies ?? [], today, profile?.weeklyGoal ?? 0);
  const active = activeInOrder(activities ?? []);
  const countLabel = todayTotals.posCount === 1 ? '1 feita' : `${todayTotals.posCount} feitas`;
  const net = todayTotals.earned - todayTotals.lost;
  const openNew = () => setEditing('new');
  const edit = useCallback((activity: Activity) => setEditing(activity), []);
  const reset = useCallback((activity: Activity) => void resetPenalty(activity), []);

  const goal =
    week.goal > 0 ? (
      <Card style={wide && styles.stat}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>Meta da semana</Text>
          <Text style={styles.goalValue}>
            {formatMoney(week.earned)} de {formatMoney(week.goal)}
          </Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: week.percent }}
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${week.percent}%` }]} />
        </View>
      </Card>
    ) : null;

  return (
    <Screen>
      {wide ? (
        <>
          <View style={styles.wideHeader}>
            <View>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              <Text accessibilityRole="header" style={styles.greeting}>
                {greeting(new Date())}, {firstName}.
              </Text>
            </View>
            <Button label="+ Nova atividade" onPress={openNew} />
          </View>
          <View style={styles.stats}>
            <View style={[styles.stat, styles.balanceCard]}>
              <Text style={[styles.caption, styles.captionOnInk]}>Saldo disponível</Text>
              {profile ? (
                <Money cents={profile.balance} style={[styles.statValue, styles.onInk]} />
              ) : (
                <Text style={[styles.statValue, styles.onInk]}>—</Text>
              )}
            </View>
            <Card style={styles.stat}>
              <Text style={styles.caption}>Hoje</Text>
              <Text style={styles.statValue}>
                {net > 0 ? '+' : ''}
                {formatMoney(net)}
              </Text>
              <Text style={styles.statHint}>
                +{formatMoney(todayTotals.earned)} ganhos · −{formatMoney(todayTotals.lost)}{' '}
                perdidos · {countLabel}
              </Text>
            </Card>
            {goal}
          </View>
        </>
      ) : (
        <>
          <View>
            <Text style={styles.caption}>Saldo disponível</Text>
            {profile ? (
              <Money cents={profile.balance} style={styles.balance} />
            ) : (
              <Text style={styles.balance}>—</Text>
            )}
            <View style={styles.chips}>
              <Text style={[styles.chip, styles.chipEarned]}>
                Hoje +{formatMoney(todayTotals.earned)}
              </Text>
              {todayTotals.lost > 0 ? (
                <Text style={[styles.chip, styles.chipLost]}>−{formatMoney(todayTotals.lost)}</Text>
              ) : null}
              <Text style={[styles.chip, styles.chipCount]}>{countLabel}</Text>
            </View>
          </View>
          {goal}
          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={styles.title}>
              Atividades
            </Text>
            <PillButton label="+ Nova" onPress={openNew} />
          </View>
        </>
      )}

      {activities === null ? (
        <Text style={styles.hint}>Carregando…</Text>
      ) : (
        <>
          {active.length === 0 ? (
            <View style={styles.welcome}>
              <Text style={styles.welcomeText}>
                <Text style={styles.welcomeStrong}>Comece por aqui:</Text> crie o que você quer
                fazer mais e o que quer evitar. Depois, um toque no valor registra.
              </Text>
            </View>
          ) : null}
          <View style={[styles.columns, wide && styles.columnsWide]}>
            {SECTIONS.map((section) => {
              const items = active.filter((activity) => activity.kind === section.kind);
              return (
                <View key={section.kind} style={[styles.list, wide && styles.column]}>
                  <View style={styles.listHeader}>
                    <Text accessibilityRole="header" style={styles.listTitle}>
                      {section.title}
                    </Text>
                    <Text style={styles.hint}>{section.hint}</Text>
                  </View>
                  {items.map((activity, index) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      number={`${section.kind === 'negative' ? '−' : ''}${String(index + 1).padStart(2, '0')}`}
                      today={today}
                      todayCount={todayTotals.counts[activity.id] ?? 0}
                      // Sem o agregado do dia, não dá para saber se o hábito completou.
                      disabled={!profile || dailies === null}
                      onRegister={registerActivity}
                      onEdit={edit}
                      onResetPenalty={reset}
                    />
                  ))}
                  {items.length === 0 ? <Text style={styles.hint}>{section.empty}</Text> : null}
                </View>
              );
            })}
          </View>
        </>
      )}

      {editing && uid ? (
        <ActivitySheet
          uid={uid}
          activity={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.graphite,
  },
  captionOnInk: { color: colors.onInkMuted },
  onInk: { color: colors.white },
  balance: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.display,
    letterSpacing: -3,
    color: colors.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    overflow: 'hidden',
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.small,
    color: colors.ink,
  },
  chipEarned: { backgroundColor: colors.accent },
  chipLost: { borderWidth: 1.5, borderColor: colors.ink, paddingVertical: 5 },
  chipCount: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    fontFamily: fonts.body,
    color: colors.slate,
  },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  goalTitle: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.small, color: colors.ink },
  goalValue: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.slate },
  track: {
    height: 8,
    marginTop: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.ink },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { fontFamily: fonts.display, fontSize: fontSizes.title, color: colors.ink },
  wideHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  date: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.graphite },
  greeting: { fontFamily: fonts.displayBold, fontSize: 44, letterSpacing: -1.5, color: colors.ink },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  stat: { flexGrow: 1, flexBasis: 240, padding: spacing.xl },
  balanceCard: { backgroundColor: colors.ink, borderRadius: radii.xl },
  statValue: {
    marginTop: 6,
    fontFamily: fonts.displayBold,
    fontSize: 44,
    letterSpacing: -1.5,
    color: colors.ink,
  },
  statHint: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.slate },
  welcome: { backgroundColor: colors.ink, borderRadius: radii.xl, padding: spacing.lg },
  welcomeText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    lineHeight: 21,
    color: colors.white,
  },
  welcomeStrong: { fontFamily: fonts.bodyBold, color: colors.accent },
  columns: { gap: spacing.xl },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flex: 1, minWidth: 0 },
  list: { gap: 10 },
  listHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  listTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.caption, color: colors.graphite },
});
