import { describe, expect, it } from 'vitest';

import { sessionSchema } from './ledger';
import {
  MINUTE_MS,
  formatClock,
  isExpired,
  newSession,
  pauseChange,
  remainingMs,
  resumeChange,
  usedMinutes,
} from './session';

const start = new Date('2026-11-25T20:00:00Z');
const after = (minutes: number) => new Date(start.getTime() + minutes * MINUTE_MS);
const session = newSession({
  id: 's1',
  itemName: 'Jogar 1 hora',
  minutes: 60,
  useEntryId: 'u1',
  deviceId: 'web-1',
  at: start,
});

describe('sessão do timer', () => {
  it('nasce rodando, com o fim calculado (TMR-01)', () => {
    expect(sessionSchema.parse(session)).toEqual(session);
    expect(session).toMatchObject({
      status: 'running',
      endsAt: after(60),
      remainingMs: 60 * MINUTE_MS,
      originDevice: 'web-1',
    });
  });

  it('conta pelo horário de fim, sem passar de zero nem da duração', () => {
    expect(remainingMs(session, after(15))).toBe(45 * MINUTE_MS);
    expect(remainingMs(session, after(90))).toBe(0);
    // Aparelho com o relógio atrasado em relação a quem iniciou.
    expect(remainingMs(session, after(-2))).toBe(60 * MINUTE_MS);
  });

  it('acaba quando chega o fim', () => {
    expect(isExpired(session, after(59))).toBe(false);
    expect(isExpired(session, after(60))).toBe(true);
  });

  it('pausar congela o restante e retomar recalcula o fim (R7)', () => {
    const paused = { ...session, ...pauseChange(session, after(10)) };
    expect(paused).toMatchObject({ status: 'paused', remainingMs: 50 * MINUTE_MS });
    expect(remainingMs(paused, after(500))).toBe(50 * MINUTE_MS);
    expect(isExpired(paused, after(500))).toBe(false);

    const resumed = { ...paused, ...resumeChange(paused, after(30)) };
    expect(resumed).toMatchObject({ status: 'running', endsAt: after(80) });
    expect(remainingMs(resumed, after(40))).toBe(40 * MINUTE_MS);
  });

  it('registra o tempo realmente usado ao encerrar antes (R6)', () => {
    expect(usedMinutes(session, after(25))).toBe(25);
    expect(usedMinutes(session, after(25.4))).toBe(25);
  });

  it('não conta a pausa como uso', () => {
    const paused = { ...session, ...pauseChange(session, after(10)) };
    expect(usedMinutes(paused, after(300))).toBe(10);
    const resumed = { ...paused, ...resumeChange(paused, after(30)) };
    expect(usedMinutes(resumed, after(35))).toBe(15);
  });

  it('fica entre 1 minuto e a duração completa', () => {
    expect(usedMinutes(session, after(0.1))).toBe(1);
    expect(usedMinutes(session, after(600))).toBe(60);
  });

  it('mostra a contagem arredondando para cima', () => {
    expect(formatClock(5 * MINUTE_MS - 2000)).toBe('04:58');
    expect(formatClock(65 * MINUTE_MS)).toBe('1:05:00');
    expect(formatClock(1)).toBe('00:01');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-5)).toBe('00:00');
  });
});
