import { Appear, SIDEBAR_BREAKPOINT, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useDock } from '@/navigation/dock';

import { useToast } from './toast';

const DURATION_MS = 3000;

/** Confirmação curta de uma ação, acima da barra de abas. */
export function ToastHost() {
  const toast = useToast((state) => state.toast);
  const { width } = useWindowDimensions();
  const wide = width >= SIDEBAR_BREAKPOINT;
  // A barra de abas flutua, com o mini timer em cima dela quando há um.
  const dock = useDock((state) => state.height);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => useToast.setState({ toast: null }), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // A região fica sempre na tela: o leitor anuncia o que entra nela.
  return (
    <View
      accessibilityLiveRegion="polite"
      role="status"
      style={[styles.region, wide ? styles.wide : { bottom: dock + spacing.sm }]}
    >
      {toast ? (
        <Appear key={toast.id} style={styles.toast}>
          {toast.amount ? <Text style={styles.amount}>{toast.amount}</Text> : null}
          <Text numberOfLines={2} style={styles.text}>
            {toast.text}
          </Text>
        </Appear>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  region: { position: 'absolute', left: spacing.lg, right: spacing.lg, pointerEvents: 'none' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
  },
  wide: { left: 'auto', right: spacing.xxl, bottom: spacing.xxl, width: 380 },
  amount: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.ink,
  },
  text: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.white },
});
