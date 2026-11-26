import { useEffect, useRef, useState } from 'react';

import { durations } from './motion';
import { useReducedMotion } from './useReducedMotion';

/**
 * Conta do valor mostrado até o novo (ANIM-04). Começa no quadro seguinte ao toque, então o saldo
 * continua mudando na hora (ANIM-05). Devolve centavos inteiros.
 */
export function useCountUp(target: number): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (reduced || from === target) {
      current.current = target;
      return;
    }
    let frame = 0;
    let started: number | null = null;
    const tick = (time: number) => {
      started ??= time;
      const progress = Math.min((time - started) / durations.count, 1);
      // Desacelera no fim.
      const eased = 1 - (1 - progress) ** 3;
      current.current = Math.round(from + (target - from) * eased);
      setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);

  return reduced ? target : shown;
}
