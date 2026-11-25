import { create } from 'zustand';

export interface ToastMessage {
  id: number;
  text: string;
  /** Etiqueta em destaque, como "+R$ 10". */
  amount?: string;
}

export const useToast = create<{ toast: ToastMessage | null }>(() => ({ toast: null }));

let nextId = 0;

export function showToast(text: string, amount?: string) {
  nextId += 1;
  useToast.setState({ toast: { id: nextId, text, amount } });
}
