import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { durations, springs } from './motion';
import { colors, radii } from './tokens';
import { useReducedMotion } from './useReducedMotion';

export interface ProgressBarProps {
  value: number;
  max: number;
  /** Para o leitor de tela. */
  label: string;
  style?: StyleProp<ViewStyle>;
}

/** Barra de progresso que enche com mola (hábito do dia e meta da semana). */
export function ProgressBar({ value, max, label, style }: ProgressBarProps) {
  const reduced = useReducedMotion();
  const fraction = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const filled = useSharedValue(fraction);

  useEffect(() => {
    filled.value = reduced
      ? withTiming(fraction, { duration: durations.fade })
      : withSpring(fraction, springs.enter);
  }, [fraction, reduced, filled]);

  const animated = useAnimatedStyle(() => ({ width: `${filled.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: Math.min(value, max) }}
      style={[styles.track, style]}
    >
      <Animated.View style={[styles.fill, animated]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.ink },
});
