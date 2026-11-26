/**
 * Android: o timer na notificação fixa (NOTIF-05) e o widget da tela inicial. Os dois vêm do
 * módulo nativo local `modules/tapago-android`. Num APK antigo, sem o módulo, nada acontece.
 */
import { requireOptionalNativeModule } from 'expo';

export interface TimerSurface {
  title: string;
  /** Fim da sessão (ms desde 1970), para a contagem regressiva do sistema. */
  endsAt: number;
  paused: boolean;
  /** O que mostrar quando pausada: "faltam 12 min". */
  pausedText: string;
}

export interface WidgetState {
  signedIn: boolean;
  balance: string;
  today: string;
  timer: TimerSurface | null;
}

interface TapagoAndroidModule {
  showTimer(title: string, endsAt: number, paused: boolean, pausedText: string): void;
  hideTimer(): void;
  updateWidget(state: string): void;
}

const native = requireOptionalNativeModule<TapagoAndroidModule>('TapagoAndroid');

function attempt(action: (module: TapagoAndroidModule) => void) {
  if (!native) return;
  try {
    action(native);
  } catch (error) {
    console.warn('Falha ao atualizar a notificação fixa ou o widget.', error);
  }
}

/** Mostra (ou atualiza) o timer na notificação fixa; `null` a remove. */
export function showTimerNotification(timer: TimerSurface | null) {
  attempt((module) =>
    timer
      ? module.showTimer(timer.title, timer.endsAt, timer.paused, timer.pausedText)
      : module.hideTimer(),
  );
}

export function updateWidget(state: WidgetState) {
  attempt((module) => module.updateWidget(JSON.stringify(state)));
}

/** Ao sair ou excluir a conta: nada da conta fica na tela inicial nem na barra. */
export function clearAndroidSurfaces() {
  showTimerNotification(null);
  updateWidget({ signedIn: false, balance: '', today: '', timer: null });
}
