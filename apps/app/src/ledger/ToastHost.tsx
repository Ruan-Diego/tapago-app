import {
  Appear,
  MIN_TOUCH,
  PressableScale,
  SIDEBAR_BREAKPOINT,
  colors,
  fonts,
  fontSizes,
  radii,
  spacing,
} from '@tapago/ui';
import { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useDock } from '@/navigation/dock';

import { undoRegistration } from './actions';
import { useToast } from './toast';
import { dropExpired, useUndo } from './undo';

const DURATION_MS = 3000;

function Message({ text, amount }: { text: string; amount?: string }) {
  return (
    <>
      {amount ? <Text style={styles.amount}>{amount}</Text> : null}
      <Text numberOfLines={3} style={styles.text}>
        {text}
      </Text>
    </>
  );
}

/**
 * Confirmações curtas acima da barra de abas. O último registro fica à parte, com o "Desfazer",
 * enquanto puder ser desfeito (ACT-05).
 */
export function ToastHost() {
  const toast = useToast((state) => state.toast);
  const undo = useUndo((state) => state.pending[state.pending.length - 1]);
  const { width } = useWindowDimensions();
  const wide = width >= SIDEBAR_BREAKPOINT;
  // A barra de abas flutua, com o mini timer em cima dela quando há um.
  const dock = useDock((state) => state.height);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => useToast.setState({ toast: null }), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(dropExpired, Math.max(0, undo.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [undo]);

  // A região fica sempre na tela: o leitor anuncia o que entra nela.
  return (
    <View
      accessibilityLiveRegion="polite"
      role="status"
      style={[styles.region, wide ? styles.wide : { bottom: dock + spacing.sm }]}
    >
      {toast ? (
        <Appear key={toast.id} style={styles.toast}>
          <Message text={toast.text} amount={toast.amount} />
        </Appear>
      ) : null}
      {undo ? (
        <Appear key={undo.id} style={[styles.toast, styles.actionable]}>
          <Message text={undo.text} amount={undo.amount} />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Desfazer o registro de ${undo.name}`}
            onPress={() => undoRegistration(undo)}
            style={styles.undo}
          >
            <Text style={styles.undoText}>Desfazer</Text>
          </PressableScale>
        </Appear>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  region: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceInk,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    pointerEvents: 'none',
  },
  actionable: { pointerEvents: 'auto', paddingVertical: spacing.sm },
  wide: { left: 'auto', right: spacing.xxl, bottom: spacing.xxl, width: 380 },
  amount: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.onAccent,
  },
  text: { flex: 1, fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.onSurfaceInk },
  undo: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoText: { fontFamily: fonts.bodyBold, fontSize: fontSizes.label, color: colors.accent },
});
