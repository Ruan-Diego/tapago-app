import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { springs } from './motion';
import { useReducedMotion } from './useReducedMotion';

export interface PopProps {
  /** Quando muda, o conteúdo dá um salto: sequência que subiu, item cumprido. */
  trigger: string | number | boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Chama atenção para o que acabou de mudar. Não anima ao aparecer pela primeira vez. */
export function Pop({ trigger, children, style }: PopProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const previous = useRef(trigger);

  useEffect(() => {
    if (previous.current === trigger) return;
    previous.current = trigger;
    if (reduced) return;
    scale.value = withSequence(withTiming(1.14, { duration: 110 }), withSpring(1, springs.trail));
  }, [trigger, reduced, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
