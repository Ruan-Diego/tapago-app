import { addDays, dayKey } from '@tapago/core';

/** "hoje 14:05", "ontem 09:30" ou "23/11 18:00", no fuso do usuário. */
export function whenLabel(at: Date, today: string, timeZone: string): string {
  const time = at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone });
  const day = dayKey(at, timeZone);
  if (day === today) return `hoje ${time}`;
  if (day === addDays(today, -1)) return `ontem ${time}`;
  return `${day.slice(8)}/${day.slice(5, 7)} ${time}`;
}
