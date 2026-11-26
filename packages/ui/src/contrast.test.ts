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

describe('texto sobre fundos lisos (4,5:1)', () => {
  type Color = Exclude<keyof typeof colors, 'heat'>;
  /** Cada cor de texto e os fundos em que o app a usa. */
  const pairs: [Color, Color[]][] = [
    ['ink', ['white', 'paper', 'track', 'accent']],
    ['slate', ['white', 'paper', 'track']],
    // O grafite não vai sobre o trilho: ali não chega a 4,5:1.
    ['graphite', ['white', 'paper']],
    ['white', ['ink', 'badDark']],
    ['onInkMuted', ['ink']],
    ['accent', ['ink']],
    ['danger', ['white', 'paper']],
  ];

  it.each(pairs.flatMap(([text, backgrounds]) => backgrounds.map((back) => [text, back])))(
    '%s sobre %s',
    (text, back) => {
      const ratio = contrastRatio(parseHex(colors[text as Color]), parseHex(colors[back as Color]));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );
});
