import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Muda a cada volta ao app (ou à aba), para refazer contas que dependem do relógio. */
export function useAppReturn(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setCount((current) => current + 1);
    });
    return () => subscription.remove();
  }, []);

  return count;
}
