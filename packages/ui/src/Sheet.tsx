import { useEffect, useRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SHEET_DISMISS, durations, springs } from './motion';
import { MIN_TOUCH, SIDEBAR_BREAKPOINT, colors, fonts, radii, spacing } from './tokens';
import { useReducedMotion } from './useReducedMotion';

export interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Quanto a caixa da web larga sobe ao aparecer. */
const WIDE_RISE = 32;

/**
 * Formulário sobre a tela: no celular, folha que sobe com mola e fecha arrastando o topo para
 * baixo; na web larga, caixa centralizada.
 */
export function Sheet({ title, onClose, children }: SheetProps) {
  const { width, height } = useWindowDimensions();
  const wide = width >= SIDEBAR_BREAKPOINT;
  const reduced = useReducedMotion();
  const away = wide ? WIDE_RISE : height;

  const offset = useSharedValue(reduced ? 0 : away);
  const shade = useSharedValue(0);
  const closing = useRef(false);

  useEffect(() => {
    shade.set(withTiming(1, { duration: durations.fade }));
    offset.set(reduced ? 0 : withSpring(0, springs.sheet));
  }, [reduced, offset, shade]);

  /** Sai animado e só então avisa quem abriu. */
  function dismiss() {
    if (closing.current) return;
    closing.current = true;
    if (!reduced) offset.set(withTiming(away, { duration: durations.exit }));
    shade.set(withTiming(0, { duration: durations.exit }));
    setTimeout(onClose, durations.exit);
  }

  const drag = usePanGesture({
    enabled: !wide,
    activeOffsetY: 8,
    onUpdate: (event) => {
      'worklet';
      offset.set(Math.max(0, event.translationY));
    },
    onDeactivate: (event) => {
      'worklet';
      const far =
        event.translationY > SHEET_DISMISS.distance || event.velocityY > SHEET_DISMISS.velocity;
      if (!event.canceled && far) scheduleOnRN(dismiss);
      else offset.set(withSpring(0, springs.sheet));
    },
  });

  const backdrop = useAnimatedStyle(() => ({ opacity: shade.value }));
  // Na caixa centralizada a opacidade acompanha o fundo; a folha do celular só desliza.
  const dialog = useAnimatedStyle(
    () => ({
      opacity: wide || reduced ? shade.value : 1,
      transform: [{ translateY: offset.value }],
    }),
    [wide, reduced],
  );

  return (
    <Modal transparent animationType="none" onRequestClose={dismiss}>
      {/* No Android o modal é outra janela: os gestos precisam de uma raiz própria. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.shade, backdrop]} />
        <KeyboardAvoidingView behavior="padding" style={[styles.overlay, wide && styles.center]}>
          <Animated.View
            accessibilityLabel={title}
            style={[styles.dialog, wide && styles.dialogWide, dialog]}
          >
            <GestureDetector gesture={drag}>
              <View style={styles.top}>
                {wide ? null : <View style={styles.grabber} />}
                <View style={styles.header}>
                  <Text accessibilityRole="header" style={styles.title}>
                    {title}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar"
                    onPress={dismiss}
                    style={styles.close}
                  >
                    <Text style={styles.closeText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            </GestureDetector>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  shade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(17,17,17,0.45)',
  },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  center: { justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  dialog: {
    maxHeight: '92%',
    backgroundColor: colors.paper,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
  },
  dialogWide: { width: '100%', maxWidth: 440, borderRadius: radii.xxl },
  top: { paddingTop: spacing.sm, paddingHorizontal: spacing.xl },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 14,
  },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: 14 },
  title: { flex: 1, fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink },
  close: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 16, color: colors.ink },
});
