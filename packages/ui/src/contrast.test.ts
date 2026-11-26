import { describe, expect, it } from 'vitest';

import { contrastRatio, parseHex, underWhiteVeil, type Rgb } from './contrast';
import { glass } from './glassTokens';
import { colors } from './tokens';

/** O pior caso atrás do vidro é o preto: com texto escuro, é onde há menos contraste. */
const BLACK: Rgb = [0, 0, 0];

describe('texto sobre o vidro', () => {
  const text = { ink: colors.ink, slate: colors.slate };

  for (const [name, color] of Object.entries(text)) {
    for (const opacity of [glass.opacity, glass.fallbackOpacity]) {
      it(`${name} com véu ${opacity} tem pelo menos 4,5:1`, () => {
        const background = underWhiteVeil(BLACK, opacity);
        expect(contrastRatio(parseHex(color), background)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('a aba selecionada (tinta sobre destaque) passa com folga', () => {
    expect(contrastRatio(parseHex(colors.ink), parseHex(colors.accent))).toBeGreaterThan(7);
  });
});
