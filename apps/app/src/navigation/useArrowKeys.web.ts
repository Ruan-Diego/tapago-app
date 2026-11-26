import type { RefObject } from 'react';

/**
 * Setas, Home e End movem o foco entre os itens do menu, como em qualquer lista de abas
 * (ANIM-03). Enter abre o item focado.
 */
export function useArrowKeys(items: RefObject<unknown[]>, current: number): object {
  return {
    onKeyDown(event: { key: string; preventDefault: () => void }) {
      const count = items.current.length;
      const next: Record<string, number> = {
        ArrowDown: (current + 1) % count,
        ArrowUp: (current - 1 + count) % count,
        Home: 0,
        End: count - 1,
      };
      const index = next[event.key];
      if (index === undefined) return;
      event.preventDefault();
      (items.current[index] as { focus(): void } | null)?.focus();
    },
  };
}
