import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let reduced = false;
let watching = false;
const listeners = new Set<() => void>();

function update(next: boolean) {
  if (next === reduced) return;
  reduced = next;
  listeners.forEach((listener) => listener());
}

/** Uma só leitura para o app inteiro, acompanhando a mudança com o app aberto. */
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!watching) {
    watching = true;
    AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    void AccessibilityInfo.isReduceMotionEnabled().then(update);
  }
  return () => {
    listeners.delete(listener);
  };
}

const read = () => reduced;

/** "Reduzir movimento" do sistema (ANIM-05). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, read);
}
