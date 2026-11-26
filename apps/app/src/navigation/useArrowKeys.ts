import type { RefObject } from 'react';

/** No Android não há teclado a tratar. */
export function useArrowKeys(_items: RefObject<unknown[]>, _current: number): object {
  return {};
}
