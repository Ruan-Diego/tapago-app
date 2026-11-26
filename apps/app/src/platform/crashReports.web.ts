/** Web: o Crashlytics é só do Android; o erro fica no console do navegador. */
export function reportError(context: string, error: unknown) {
  console.error(context, error);
}
