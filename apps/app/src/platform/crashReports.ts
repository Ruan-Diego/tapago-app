/**
 * Android: erros que o app tratou também vão para o Crashlytics. As quedas do app são coletadas
 * sozinhas no APK de instalação; em desenvolvimento a coleta fica desligada.
 */
import { getCrashlytics, log, recordError } from '@react-native-firebase/crashlytics';

/** Registra um erro tratado, sem nenhum dado da conta. */
export function reportError(context: string, error: unknown) {
  console.error(context, error);
  const crashlytics = getCrashlytics();
  log(crashlytics, context);
  recordError(crashlytics, error instanceof Error ? error : new Error(String(error)));
}
