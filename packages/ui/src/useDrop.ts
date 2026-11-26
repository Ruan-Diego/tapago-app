import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { durations, springs } from './motion';
import { useReducedMotion } from './useReducedMotion';

export interface DropOptions {
  /** Onde a gota deve ficar, em pontos a partir do início do trilho. */
  target: SharedValue<number>;
  /** Tamanho da gota parada; 0 enquanto o trilho não foi medido. */
  length: number;
  axis: 'x' | 'y';
}

/** Quanto a gota afina, no máximo, ao esticar. */
const SQUASH = 0.16;

/**
 * O indicador em gota (ANIM-02, 03): as duas bordas seguem o alvo com molas diferentes, então ela
 * estica no caminho e assenta no destino. Com "reduzir movimento", só desliza.
 */
export function useDrop({ target, length, axis }: DropOptions) {
  const reduced = useReducedMotion();
  const start = useSharedValue(0);
  const end = useSharedValue(0);

  /** O tamanho com que as bordas foram colocadas: mudou, a gota vai direto para o lugar. */
  const placed = useSharedValue(-1);

  useAnimatedReaction(
    () => target.value,
    (next) => {
      // Primeira medida ou trilho redimensionado.
      if (placed.value !== length) {
        placed.value = length;
        start.value = next;
        end.value = next + length;
      } else if (reduced) {
        start.value = withTiming(next, { duration: durations.fade });
        end.value = withTiming(next + length, { duration: durations.fade });
      } else {
        const forward = next > start.value;
        start.value = withSpring(next, forward ? springs.trail : springs.lead);
        end.value = withSpring(next + length, forward ? springs.lead : springs.trail);
      }
    },
    [length, reduced],
  );

  return useAnimatedStyle(() => {
    const size = Math.max(0, end.value - start.value);
    const stretch = length > 0 ? Math.min(Math.abs(size - length) / length, 1) : 0;
    const scale = 1 - stretch * SQUASH;
    return axis === 'x'
      ? { width: size, transform: [{ translateX: start.value }, { scaleY: scale }] }
      : { height: size, transform: [{ translateY: start.value }, { scaleX: scale }] };
  }, [length, axis]);
}
