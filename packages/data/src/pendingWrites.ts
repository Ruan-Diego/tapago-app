/** `true` se `synced` não resolver dentro do prazo (ou falhar). */
export function isStillPending(synced: Promise<unknown>, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(true), timeoutMs);
    synced.then(
      () => {
        clearTimeout(timer);
        resolve(false);
      },
      () => {
        clearTimeout(timer);
        resolve(true);
      },
    );
  });
}
