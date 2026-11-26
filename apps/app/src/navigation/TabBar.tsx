import { Glass, Icon, colors, fonts, spacing, useDrop } from '@tapago/ui';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { MiniTimer } from '@/timer/MiniTimer';

import { useDock } from './dock';
import { useNavItems } from './useNavItems';

const PADDING = 6;
const GAP = 4;

/**
 * Barra de abas do celular: vidro flutuante com a seleção em gota (ANIM-01, 02). Arrastar sobre
 * ela leva a gota junto com o dedo; soltar abre a aba onde ela parou.
 */
export function TabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const items = useNavItems(props);
  const blurTarget = useDock((state) => state.target);
  const [width, setWidth] = useState(0);
  /** A aba sob o dedo durante o arraste. */
  const [pointed, setPointed] = useState<number | null>(null);

  const count = items.length;
  const length = width > 0 ? (width - PADDING * 2 - GAP * (count - 1)) / count : 0;
  const step = length + GAP;
  const selected = Math.max(
    0,
    items.findIndex((item) => item.selected),
  );

  const target = useSharedValue(selected * step);
  useEffect(() => {
    target.set(selected * step);
  }, [selected, step, target]);
  const drop = useDrop({ target, length, axis: 'x' });

  useEffect(() => () => useDock.setState({ height: 0 }), []);

  function release(index: number, canceled: boolean) {
    setPointed(null);
    if (canceled) target.set(selected * step);
    else items[index]?.onPress();
  }

  const drag = usePanGesture({
    enabled: length > 0,
    activeOffsetX: [-8, 8],
    onUpdate: (event) => {
      'worklet';
      const centered = event.x - PADDING - length / 2;
      const position = Math.min(Math.max(centered, 0), (count - 1) * step);
      target.set(position);
      scheduleOnRN(setPointed, Math.round(position / step));
    },
    onDeactivate: (event) => {
      'worklet';
      const index = Math.round(target.value / step);
      target.set(index * step);
      scheduleOnRN(release, index, event.canceled);
    },
  });

  return (
    <View
      onLayout={(event) => useDock.setState({ height: event.nativeEvent.layout.height })}
      style={[styles.dock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
    >
      {items.some((item) => item.selected && item.route === 'inventory') ? null : <MiniTimer />}
      <GestureDetector gesture={drag}>
        <View>
          <Glass blurTarget={blurTarget} style={styles.bar}>
            <View
              accessibilityRole="tablist"
              accessibilityLabel="Navegação principal"
              onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
              style={styles.items}
            >
              {length > 0 ? <Animated.View style={[styles.drop, drop]} /> : null}
              {items.map((item, index) => {
                const lit = (pointed ?? selected) === index;
                const color = lit ? colors.onAccent : colors.slate;
                return (
                  <Pressable
                    key={item.route}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: item.selected }}
                    aria-selected={item.selected}
                    accessibilityLabel={item.label}
                    onPress={item.onPress}
                    style={[styles.item, item.selected && length === 0 && styles.unmeasured]}
                  >
                    <Icon name={item.icon} color={color} />
                    <Text numberOfLines={1} style={[styles.label, { color }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Glass>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  // Flutua sobre a tela, para o conteúdo passar por trás do vidro.
  dock: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    gap: spacing.sm,
    pointerEvents: 'box-none',
  },
  bar: { borderRadius: 28 },
  items: { height: 66, flexDirection: 'row', gap: GAP, padding: PADDING },
  drop: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: 22,
    backgroundColor: colors.accent,
    pointerEvents: 'none',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 22 },
  unmeasured: { backgroundColor: colors.accent },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 10 },
});
