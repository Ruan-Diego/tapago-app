import type { TimerAlert } from '@tapago/core';
import { create } from 'zustand';

/** Alerta mostrado dentro do app (ou da página) na hora do aviso. */
export const useAlertBanner = create<{ alert: TimerAlert | null }>(() => ({ alert: null }));
