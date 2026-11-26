import type { ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import { durations, springs } from './motion';
import { useReducedMotion } from './useReducedMotion';

export interface AppearProps {
  children: ReactNode;
  /** De onde vem: `below` sobe até o lugar, `above` desce. */
  from?: 'below' | 'above';
  style?: StyleProp<ViewStyle>;
}

/**
 * Entra e sai animado, e acompanha com mola quando os vizinhos mudam (ANIM-04). Com "reduzir
 * movimento", só aparece e some.
 */
export function Appear({ children, from = 'below', style }: AppearProps) {
  const reduced = useReducedMotion();
  const slide = from === 'below' ? FadeInDown : FadeInUp;

  return (
    <Animated.View
      entering={
        reduced
          ? FadeIn.duration(durations.fade)
          : slide
              .springify()
              .mass(springs.enter.mass)
              .damping(springs.enter.damping)
              .stiffness(springs.enter.stiffness)
      }
      exiting={FadeOut.duration(durations.exit)}
      // Na web o reposicionamento é feito esticando o item, o que distorce o texto: só no Android.
      layout={
        reduced || Platform.OS === 'web'
          ? undefined
          : LinearTransition.springify().damping(springs.enter.damping)
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}
