import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';

import { MIN_TOUCH, colors, fonts, fontSizes, radii } from './tokens';
import { useDrop } from './useDrop';

export interface TabsProps<Value extends string> {
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}

const PADDING = 4;
const GAP = 4;

/** Abas segmentadas, para alternar entre visões dentro de uma tela. */
export function Tabs<Value extends string>({ options, value, onChange }: TabsProps<Value>) {
  const [width, setWidth] = useState(0);
  const length =
    width > 0 ? (width - PADDING * 2 - GAP * (options.length - 1)) / options.length : 0;
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const target = useSharedValue(index * (length + GAP));

  useEffect(() => {
    target.value = index * (length + GAP);
  }, [index, length, target]);

  const drop = useDrop({ target, length, axis: 'x' });

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={styles.list}
    >
      {length > 0 ? <Animated.View style={[styles.drop, drop]} /> : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            aria-selected={selected}
            onPress={() => onChange(option.value)}
            // Antes da primeira medida a gota não existe: o fundo fica no próprio item.
            style={[styles.tab, selected && length === 0 && styles.unmeasured]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    backgroundColor: colors.track,
    borderRadius: radii.pill,
    padding: PADDING,
    gap: GAP,
  },
  drop: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceInk,
    pointerEvents: 'none',
  },
  tab: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unmeasured: { backgroundColor: colors.surfaceInk },
  label: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.slate },
  selectedLabel: { color: colors.onSurfaceInk },
});
