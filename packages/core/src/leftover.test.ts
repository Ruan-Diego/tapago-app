import { describe, expect, it } from 'vitest';

import { inventoryItemSchema } from './ledger';
import {
  MINUTE_MS,
  leftoverMinutes,
  leftoverValue,
  newSession,
  pauseChange,
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

describe('guardar o resto do lazer para depois', () => {
  it('guarda os minutos inteiros que faltam', () => {
    expect(leftoverMinutes(session, after(15))).toBe(45);
    // 44,5 minutos restantes: guarda 44, e o meio minuto conta como usado.
    expect(leftoverMinutes(session, new Date(after(15).getTime() + 30_000))).toBe(44);
  });

  it('não tem o que guardar com menos de 1 minuto', () => {
    expect(leftoverMinutes(session, new Date(after(59).getTime() + 1))).toBe(0);
    expect(leftoverMinutes(session, after(90))).toBe(0);
  });

  it('pausada, guarda o restante congelado', () => {
    const paused = { ...session, ...pauseChange(session, after(20)) };
    expect(leftoverMinutes(paused, after(500))).toBe(40);
    expect(usedMinutes(paused, after(500))).toBe(20);
  });

  it('informa a parte do preço que sobrou, sem passar de 1 centavo para baixo', () => {
    expect(leftoverValue(3000, 45, 60)).toBe(2250);
    expect(leftoverValue(100, 1, 1440)).toBe(1);
    expect(leftoverValue(500, 10, 0)).toBe(500);
  });

  it('o item do resto guarda a duração original', () => {
    const item = {
      shopItemId: 'jogar',
      name: 'Jogar 1 hora',
      value: 2250,
      minutes: 45,
      purchaseEntryId: 'u1',
      purchasedAt: after(15),
      leftFrom: 60,
    };
    expect(inventoryItemSchema.parse(item)).toEqual(item);
    const { leftFrom: _leftFrom, ...bought } = item;
    expect(inventoryItemSchema.parse(bought).leftFrom).toBeUndefined();
  });
});
