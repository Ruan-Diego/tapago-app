import { Appear, SIDEBAR_BREAKPOINT, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { InventoryRow } from '@/inventory/InventoryRow';
import { TimerCard } from '@/inventory/TimerCard';
import { startFromInventory } from '@/ledger/actions';
import { useLedger } from '@/ledger/store';
import { deviceTimeZone, useToday } from '@/ledger/useToday';
import { PageHeading } from '@/navigation/PageHeading';
import { Screen } from '@/navigation/Screen';
import { useSession } from '@/session/store';

export default function Inventory() {
  const wide = useWindowDimensions().width >= SIDEBAR_BREAKPOINT;
  const timeZone = useSession((state) => state.profile?.timezone) ?? deviceTimeZone();
  const timer = useLedger((state) => state.timer);
  const inventory = useLedger((state) => state.inventory);
  const today = useToday();
  const session = timer?.session;
  const count = inventory?.length ?? 0;

  return (
    <Screen>
      <PageHeading eyebrow="Inventário" title={'Já tá pago.\nÉ só usar.'} />
      <View style={wide ? styles.columns : styles.stack}>
        <View style={wide && styles.column}>
          {session ? (
            <Appear key={session.id}>
              <TimerCard session={session} timeZone={timeZone} />
            </Appear>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nenhum timer rodando.</Text>
              <Text style={styles.emptyText}>
                Escolha algo guardado e toque em Começar. A gente avisa 5 minutos antes e quando
                acabar.
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.list, wide && styles.column]}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Guardados
            </Text>
            {inventory ? (
              <Text style={styles.hint}>{count === 1 ? '1 item' : `${count} itens`}</Text>
            ) : null}
          </View>
          {inventory === null ? (
            <Text style={styles.hint}>Carregando…</Text>
          ) : count === 0 ? (
            <Text style={styles.hint}>
              Nada guardado. Na Loja, escolha “Guardar no inventário” ao comprar.
            </Text>
          ) : (
            inventory.map((item) => (
              <Appear key={item.id}>
                <InventoryRow
                  item={item}
                  today={today}
                  timeZone={timeZone}
                  canStart={timer !== null && !session}
                  onStart={startFromInventory}
                />
              </Appear>
            ))
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xl },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  column: { flex: 1, minWidth: 0 },
  list: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontFamily: fonts.display, fontSize: fontSizes.title, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.graphite },
  empty: {
    gap: spacing.xs,
    padding: spacing.xl,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.graphite,
  },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink },
  emptyText: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.slate },
});
