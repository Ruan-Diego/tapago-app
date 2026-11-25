import type { ConfirmOptions } from './confirm';

export function confirm({ title, message }: ConfirmOptions): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
