import {
  Logo,
  Money,
  SIDEBAR_BREAKPOINT,
  colors,
  fonts,
  fontSizes,
  radii,
  spacing,
} from '@tapago/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLedger } from '@/ledger/store';
import { useSession } from '@/session/store';

/** Moldura das abas: no celular, cabeçalho com o saldo; na web larga, título grande. */
export function Screen({ title, children }: { title?: string; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width >= SIDEBAR_BREAKPOINT;
  const balance = useSession((state) => state.profile?.balance);
  const profileError = useSession((state) => state.profileError);
  const ledgerError = useLedger((state) => state.error);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {wide ? null : (
        <View style={styles.header}>
          <Logo />
          <View style={styles.pill}>
            <View style={styles.dot} />
            {balance === undefined ? (
              <Text style={styles.pillValue}>—</Text>
            ) : (
              <Money accessibilityLabel="Saldo" cents={balance} style={styles.pillValue} />
            )}
          </View>
        </View>
      )}
      <ScrollView contentContainerStyle={[styles.scroll, wide && styles.scrollWide]}>
        <View style={styles.content}>
          {title ? (
            <Text accessibilityRole="header" style={[styles.title, wide && styles.titleWide]}>
              {title}
            </Text>
          ) : null}
          {profileError || ledgerError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              Não foi possível carregar a sua conta. Confira a conexão e abra o app de novo.
            </Text>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingLeft: 10,
    paddingRight: 14,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  pillValue: { fontFamily: fonts.display, fontSize: 15, color: colors.white },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  scrollWide: { paddingHorizontal: 48, paddingTop: 40, paddingBottom: 72 },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: spacing.lg },
  title: { fontFamily: fonts.display, fontSize: fontSizes.title, color: colors.ink },
  titleWide: { fontFamily: fonts.displayBold, fontSize: fontSizes.heading },
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.label, color: colors.danger },
});
