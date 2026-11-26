/** Web: não há notificação fixa nem widget. */
export interface TimerSurface {
  title: string;
  endsAt: number;
  paused: boolean;
  pausedText: string;
}

export interface WidgetState {
  signedIn: boolean;
  balance: string;
  today: string;
  timer: TimerSurface | null;
}

export function showTimerNotification(_timer: TimerSurface | null) {}

export function updateWidget(_state: WidgetState) {}

export function clearAndroidSurfaces() {}
