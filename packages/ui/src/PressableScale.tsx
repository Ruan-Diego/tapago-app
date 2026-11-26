import { Pressable } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PRESSED_SCALE, durations, springs } from './motion';
import { useReducedMotion } from './useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
}

/**
 * Botão ou cartão que afunda ao toque e volta com mola (ANIM-04). A animação corre à parte: o
 * `onPress` não espera por ela (ANIM-05).
 */
export function PressableScale({ style, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(
    () =>
      reduced
        ? { opacity: 1 - pressed.value * 0.3, transform: [{ scale: 1 }] }
        : { opacity: 1, transform: [{ scale: 1 - pressed.value * (1 - PRESSED_SCALE) }] },
    [reduced],
  );
  // Desativado, o esmaecimento do `style` manda: a opacidade animada não pode passar por cima.
  const inactive = Boolean(rest.disabled);
  const move = (to: 0 | 1) => {
    pressed.value = reduced
      ? withTiming(to, { duration: durations.fade })
      : withSpring(to, springs.press);
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        move(1);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        move(0);
        onPressOut?.(event);
      }}
      style={[style, !inactive && animated]}
    />
  );
}
