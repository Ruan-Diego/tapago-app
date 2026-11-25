import { describe, expect, it } from 'vitest';

import { alertChanges, isAlertStale, timerAlerts, type AlertOptions } from './alerts';
import { MINUTE_MS, newSession, pauseChange, resumeChange } from './session';

const start = new Date('2026-11-25T20:00:00Z');
const after = (minutes: number) => new Date(start.getTime() + minutes * MINUTE_MS);
const make = (minutes: number, id = 's1') =>
  newSession({
    id,
    itemName: 'Jogar 1 hora',
    minutes,
    useEntryId: 'u1',
    deviceId: 'web-1',
    at: start,
  });
const session = make(60);
const options = (now = start, prefs = { end: true, warn5: true }): AlertOptions => ({
  prefs,
  timeZone: 'America/Sao_Paulo',
  now,
});
const times = (alerts: ReturnType<typeof timerAlerts>) =>
  alerts.map((alert) => [alert.kind, alert.at]);
const ids = (alerts: ReturnType<typeof timerAlerts>) => alerts.map((alert) => alert.id);

describe('horários dos avisos', () => {
  it('avisa 5 minutos antes e no fim, com o horário no fuso do usuário', () => {
    const alerts = timerAlerts(session, options());
    expect(times(alerts)).toEqual([
      ['warn5', after(55)],
      ['end', after(60)],
    ]);
    expect(alerts[0]?.body).toBe('Jogar 1 hora termina às 18:00.');
    expect(alerts[1]?.title).toBe('Tempo esgotado');
  });

  it('só avisa 5 minutos antes em sessões de mais de 5 minutos (NOTIF-02)', () => {
    expect(times(timerAlerts(make(5), options()))).toEqual([['end', after(5)]]);
    expect(timerAlerts(make(6), options())).toHaveLength(2);
  });

  it('respeita as preferências do perfil', () => {
    expect(times(timerAlerts(session, options(start, { end: true, warn5: false })))).toEqual([
      ['end', after(60)],
    ]);
    expect(timerAlerts(session, options(start, { end: false, warn5: false }))).toEqual([]);
  });

  it('não agenda o que já passou', () => {
    expect(times(timerAlerts(session, options(after(57))))).toEqual([['end', after(60)]]);
    expect(timerAlerts(session, options(after(61)))).toEqual([]);
  });

  it('não avisa sem sessão rodando', () => {
    expect(timerAlerts(null, options())).toEqual([]);
    const paused = { ...session, ...pauseChange(session, after(10)) };
    expect(timerAlerts(paused, options(after(10)))).toEqual([]);
  });
});

describe('reagendamento', () => {
  const scheduled = ids(timerAlerts(session, options()));

  it('agenda tudo em um aparelho que acabou de ver a sessão', () => {
    const changes = alertChanges(timerAlerts(session, options()), [], start);
    expect(changes.cancel).toEqual([]);
    expect(ids(changes.schedule)).toEqual(scheduled);
  });

  it('não duplica quando a mesma sessão é vista de novo', () => {
    const changes = alertChanges(timerAlerts(session, options(after(1))), scheduled, after(1));
    expect(changes).toEqual({ cancel: [], schedule: [] });
  });

  it('pausar cancela; retomar agenda nos novos horários (TMR-02)', () => {
    const paused = { ...session, ...pauseChange(session, after(10)) };
    expect(alertChanges([], scheduled, after(10)).cancel).toEqual(scheduled);

    const resumed = { ...paused, ...resumeChange(paused, after(20)) };
    const desired = timerAlerts(resumed, options(after(20)));
    expect(times(desired)).toEqual([
      ['warn5', after(65)],
      ['end', after(70)],
    ]);
    const changes = alertChanges(desired, scheduled, after(20));
    expect(changes.cancel).toEqual(scheduled);
    expect(changes.schedule).toEqual(desired);
  });

  it('encerrar antes cancela os avisos (TMR-03)', () => {
    expect(alertChanges([], scheduled, after(30)).cancel).toEqual(scheduled);
  });

  it('troca os avisos quando outro aparelho começa outra sessão', () => {
    const desired = timerAlerts(make(30, 's2'), options(after(1)));
    const changes = alertChanges(desired, scheduled, after(1));
    expect(changes.cancel).toEqual(scheduled);
    expect(changes.schedule).toEqual(desired);
  });

  it('não cancela o aviso que está vencendo quando a sessão termina sozinha', () => {
    const end = scheduled[1]!;
    expect(alertChanges([], [end], after(60)).cancel).toEqual([]);
    expect(alertChanges([], [end], new Date(after(60).getTime() - 3000)).cancel).toEqual([]);
    expect(alertChanges([], [end], after(59)).cancel).toEqual([end]);
  });

  it('ignora notificações que não são do timer', () => {
    expect(alertChanges([], ['resumo-semanal', 'tapago-timer:x'], start).cancel).toEqual([]);
  });
});

describe('aviso atrasado', () => {
  const [warn, end] = timerAlerts(session, options());

  it('descarta o de 5 minutos depois do fim, mas não o de fim', () => {
    expect(isAlertStale(warn!, after(56))).toBe(false);
    expect(isAlertStale(warn!, after(60))).toBe(true);
    expect(isAlertStale(end!, after(120))).toBe(false);
  });
});
