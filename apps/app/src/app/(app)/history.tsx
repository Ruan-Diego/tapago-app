import { periodComparison } from '@tapago/core';
import {
  Button,
  Card,
  SIDEBAR_BREAKPOINT,
  colors,
  fonts,
  fontSizes,
  radii,
  spacing,
} from '@tapago/ui';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { EntryRow } from '@/history/EntryRow';
import { summaryCards } from '@/history/summary';
import { useRecentEntries } from '@/history/useRecentEntries';
import { PERIOD_DAYS, useLedger } from '@/ledger/store';
import { deviceTimeZone, useToday } from '@/ledger/useToday';
import { PageHeading } from '@/navigation/PageHeading';
import { Screen } from '@/navigation/Screen';
import { useSession } from '@/session/store';

export default function History() {
  const wide = useWindowDimensions().width >= SIDEBAR_BREAKPOINT;
  const uid = useSession((state) => state.user?.uid);
  const timeZone = useSession((state) => state.profile?.timezone) ?? deviceTimeZone();
  const dailies = useLedger((state) => state.dailies);
  const today = useToday();
  const recent = useRecentEntries(uid);
  const { current, previous } = periodComparison(dailies ?? [], today, PERIOD_DAYS);
  const visible = recent.entries.filter((entry) => entry.type !== 'use');

  return (
    <Screen>
      <PageHeading eyebrow="Histórico" title={'Pra onde vai\no seu tempo.'}>
        {`Últimos ${PERIOD_DAYS} dias.`}
      </PageHeading>
      {dailies === null ? (
        <Text style={styles.hint}>Carregando…</Text>
      ) : (
        <View style={styles.grid}>
          {summaryCards(current, previous, PERIOD_DAYS).map((card) => {
            const dark = card.key === 'earned';
            return (
              <View
                key={card.key}
                style={[
                  styles.card,
                  wide ? styles.cellWide : styles.cell,
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
      )}
      <Card>
        <Text accessibilityRole="header" style={styles.recentTitle}>
          Atividade recente
        </Text>
        {visible.map((entry) => (
          <EntryRow key={entry.id} entry={entry} today={today} timeZone={timeZone} />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { flexBasis: '47%', flexGrow: 1 },
  cellWide: { flexBasis: 300, flexGrow: 1 },
  card: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dark: { backgroundColor: colors.ink, borderColor: colors.ink },
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
  onInk: { color: colors.white },
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
