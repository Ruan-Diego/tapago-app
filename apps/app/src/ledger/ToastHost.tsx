import { SIDEBAR_BREAKPOINT, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from './toast';

const DURATION_MS = 3000;

/** Confirmação curta de uma ação, acima da barra de abas. */
export function ToastHost() {
  const toast = useToast((state) => state.toast);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= SIDEBAR_BREAKPOINT;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => useToast.setState({ toast: null }), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      role="status"
      style={[styles.toast, wide ? styles.wide : { bottom: 94 + Math.max(insets.bottom, 12) }]}
    >
      {toast.amount ? <Text style={styles.amount}>{toast.amount}</Text> : null}
      <Text numberOfLines={2} style={styles.text}>
        {toast.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    pointerEvents: 'none',
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
