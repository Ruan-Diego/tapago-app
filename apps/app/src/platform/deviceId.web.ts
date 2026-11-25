const KEY = 'tapago.deviceId';

let cached: string | null = null;

/** Identifica este navegador nos lançamentos. */
export function deviceId(): string {
  if (cached) return cached;
  const fresh = `web-${Math.random().toString(36).slice(2, 12)}`;
  try {
    cached = window.localStorage.getItem(KEY);
    if (!cached) window.localStorage.setItem(KEY, fresh);
  } catch {
    // Armazenamento bloqueado: o id vale só até fechar a aba.
  }
  cached ??= fresh;
  return cached;
}
