import { describe, expect, it } from 'vitest';

import { formatMoney } from './money';

// O Intl separa "R$" do número com espaço não separável.
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('formatMoney (R1)', () => {
  it('omite os centavos em valores redondos', () => {
    expect(plain(formatMoney(1800))).toBe('R$ 18');
    expect(plain(formatMoney(0))).toBe('R$ 0');
  });

  it('mostra os centavos quando existem', () => {
    expect(plain(formatMoney(1850))).toBe('R$ 18,50');
  });

  it('separa milhares em pt-BR', () => {
    expect(plain(formatMoney(1_000_000))).toBe('R$ 10.000');
  });

  it('usa o sinal de menos em saldo negativo', () => {
    expect(plain(formatMoney(-800))).toBe('−R$ 8');
  });

  it('rejeita centavos fracionados', () => {
    expect(() => formatMoney(10.5)).toThrow(RangeError);
  });
});
