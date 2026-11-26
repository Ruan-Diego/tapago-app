import {
  DEFAULT_PERIOD,
  HISTORY_PERIODS,
  addDays,
  balanceSeries,
  bestStreak,
  countCleanDays,
  currentStreak,
  firstActiveDay,
  formatDuration,
  formatMoney,
  heatmap,
  periodComparison,
  rankings,
  weeklyMinutes,
  type HistoryPeriod,
  type RankingRow,
} from '@tapago/core';
import {
  Appear,
  Button,
  Card,
  SIDEBAR_BREAKPOINT,
  Tabs,
  colors,
  fonts,
  fontSizes,
  radii,
  spacing,
} from '@tapago/ui';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BalanceChart } from '@/history/BalanceChart';
import { Consistency } from '@/history/Consistency';
import { EntryRow } from '@/history/EntryRow';
import { NetCard } from '@/history/NetCard';
import { Ranking, type RankingBar } from '@/history/Ranking';
import { TimeSplit } from '@/history/TimeSplit';
import { WeeklyHours } from '@/history/WeeklyHours';
import { plural } from '@/history/format';
import { summaryCards } from '@/history/summary';
import { useAllDailies } from '@/history/useAllDailies';
import { usePeriodEntries } from '@/history/usePeriodEntries';
import { useRecentEntries } from '@/history/useRecentEntries';
import { useLedger } from '@/ledger/store';
import { deviceTimeZone, useToday } from '@/ledger/useToday';
import { PageHeading } from '@/navigation/PageHeading';
import { Screen } from '@/navigation/Screen';
import { useSession } from '@/session/store';

const PERIOD_OPTIONS = HISTORY_PERIODS.map((days) => ({
  value: String(days),
  label: `${days} dias`,
}));

const byTime = (rows: RankingRow[]): RankingBar[] =>
  rows.map((row) => ({
    key: row.refId,
    name: row.name,
    label: `${formatDuration(row.minutes)} · ${row.count}×`,
    amount: row.minutes,
  }));

const byValue = (rows: RankingRow[]): RankingBar[] =>
  rows.map((row) => ({
    key: row.refId,
    name: row.name,
    label: `${formatMoney(-row.value)} · ${row.count}×`,
    amount: row.value,
  }));

export default function History() {
  const wide = useWindowDimensions().width >= SIDEBAR_BREAKPOINT;
  const uid = useSession((state) => state.user?.uid);
  const timeZone = useSession((state) => state.profile?.timezone) ?? deviceTimeZone();
  const balance = useSession((state) => state.profile?.balance);
  const openUseEntryId = useLedger((state) => state.timer?.session?.useEntryId);
  const dailies = useAllDailies();
  const today = useToday();
  const recent = useRecentEntries(uid);
  const visible = recent.entries.filter((entry) => entry.type !== 'use');
  // O estorno é sempre mais novo que o desfeito: se o original está na lista, ele também.
  const undone = new Set(recent.entries.map((entry) => entry.reverses));

  const [period, setPeriod] = useState<HistoryPeriod>(DEFAULT_PERIOD);
  /** O maior período já visto: até onde os lançamentos dos rankings foram lidos. */
  const [widest, setWidest] = useState<HistoryPeriod>(DEFAULT_PERIOD);
  const periodEntries = usePeriodEntries(uid, today, widest);
  const from = addDays(today, 1 - period);

  function choose(value: string) {
    const days = HISTORY_PERIODS.find((option) => String(option) === value) ?? DEFAULT_PERIOD;
    setPeriod(days);
    if (days > widest) setWidest(days);
  }

  const loaded = periodEntries.loaded;
  // Uma leitura mais curta que o período pedido daria um ranking pela metade.
  const ranked = useMemo(
    () =>
      loaded && loaded.days >= period
        ? rankings(loaded.entries, { from, today, timeZone, openUseEntryId })
        : null,
    [loaded, period, from, today, timeZone, openUseEntryId],
  );

  const days = dailies ?? [];
  const { current, previous } = periodComparison(days, today, period);
  const first = firstActiveDay(days);
  // Antes do primeiro registro não há dia limpo a contar.
  const cleanDays = first ? countCleanDays(days, first > from ? first : from, today) : 0;
  const cell = wide ? styles.blockWide : null;

  return (
    <Screen>
      <View style={[styles.heading, wide && styles.headingWide]}>
        <PageHeading eyebrow="Histórico" title={'Pra onde vai\no seu tempo.'} />
        <View style={wide && styles.filterWide}>
          <Tabs options={PERIOD_OPTIONS} value={String(period)} onChange={choose} />
        </View>
      </View>

      {dailies === null ? (
        <Text style={styles.hint}>Carregando…</Text>
      ) : (
        <>
          <View style={styles.grid}>
            {summaryCards(current, previous, period).map((card) => {
              const dark = card.key === 'earned';
              return (
                <View
                  key={card.key}
                  style={[
                    styles.card,
                    wide ? styles.summaryWide : styles.summary,
                    dark && styles.dark,
                    card.key === 'lost' && styles.outlined,
                  ]}
                >
                  <Text style={[styles.cardTitle, dark && styles.muted]}>{card.title}</Text>
                  <Text style={[styles.value, dark && styles.onInk]}>{card.value}</Text>
                  <Text style={[styles.detail, dark && styles.muted]}>{card.detail}</Text>
                  <Text style={[styles.change, dark && styles.accent]}>{card.change}</Text>
                </View>
              );
            })}
          </View>

          {/* Na web larga os blocos formam um painel de duas colunas. */}
          <View style={[styles.blocks, wide && styles.blocksWide]}>
            <View style={cell}>
              <TimeSplit totals={current} />
            </View>
            {balance === undefined ? null : (
              <View style={cell}>
                <BalanceChart
                  series={balanceSeries(days, balance, from, today)}
                  height={wide ? 160 : 90}
                />
              </View>
            )}
            <View style={cell}>
              <WeeklyHours weeks={weeklyMinutes(days, today)} />
            </View>
            <View style={cell}>
              <Consistency
                weeks={heatmap(days, today)}
                today={today}
                streak={currentStreak(days, today)}
                record={bestStreak(days)}
                cleanDays={cleanDays}
              />
            </View>
            <View style={cell}>
              <Ranking
                title="Tempo por atividade boa"
                tone="good"
                rows={ranked && byTime(ranked.activities)}
                empty="Nenhuma atividade boa neste período ainda."
              />
            </View>
            <View style={cell}>
              <Ranking
                title="Tempo por lazer"
                tone="leisure"
                rows={ranked && byTime(ranked.leisure)}
                empty="Nenhum lazer usado neste período ainda."
              />
            </View>
            <View style={cell}>
              <Ranking
                title="Onde você perdeu"
                note={`R$ em ${plural(period, 'dia', 'dias')}`}
                tone="bad"
                rows={ranked && byValue(ranked.losses)}
                empty="Nenhum deslize neste período. Tá pago, e bem pago."
              />
            </View>
            {wide ? <NetCard totals={current} style={styles.blockWide} /> : null}
          </View>
          {periodEntries.failed ? (
            <Text accessibilityRole="alert" style={styles.error}>
              Não foi possível carregar os rankings.
            </Text>
          ) : null}
        </>
      )}

      <Card>
        <Text accessibilityRole="header" style={styles.recentTitle}>
          Atividade recente
        </Text>
        {visible.map((entry) => (
          <Appear key={entry.id}>
            <EntryRow
              entry={entry}
              today={today}
              timeZone={timeZone}
              undone={undone.has(entry.id)}
            />
          </Appear>
        ))}
        {!recent.loaded ? <Text style={styles.hint}>Carregando…</Text> : null}
        {recent.loaded && visible.length === 0 ? (
          <Text style={styles.hint}>Nada por aqui ainda.</Text>
        ) : null}
        {recent.failed ? (
          <Text accessibilityRole="alert" style={styles.error}>
            Não foi possível carregar os lançamentos.
          </Text>
        ) : null}
        {recent.hasMore && visible.length > 0 ? (
          <Button
            label="Carregar mais"
            variant="secondary"
            loading={recent.loadingMore}
            onPress={() => void recent.loadMore()}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.md },
  headingWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  filterWide: { width: 340 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summary: { flexBasis: '47%', flexGrow: 1 },
  summaryWide: { flexBasis: 220, flexGrow: 1 },
  blocks: { gap: 10 },
  blocksWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 14 },
  blockWide: { flexBasis: 360, flexGrow: 1, minWidth: 0 },
  card: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dark: { backgroundColor: colors.surfaceInk, borderColor: colors.ink },
  outlined: { borderWidth: 1.5, borderColor: colors.ink },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.graphite,
  },
  value: {
    marginTop: 6,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    letterSpacing: -1,
    color: colors.ink,
  },
  detail: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.graphite,
  },
  change: {
    marginTop: 4,
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.caption,
    color: colors.slate,
  },
  onInk: { color: colors.onSurfaceInk },
  muted: { color: colors.onInkMuted },
  accent: { color: colors.accent },
  recentTitle: {
    marginBottom: spacing.sm,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.graphite },
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.small, color: colors.danger },
});
