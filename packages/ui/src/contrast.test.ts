import { describe, expect, it } from 'vitest';

import { contrastRatio, parseHex, underWhiteVeil, type Rgb } from './contrast';
import {
  darkColors,
  darkGlass,
  lightColors,
  lightGlass,
  type GlassTokens,
  type Palette,
} from './palettes';
import { resolveScheme } from './themePreference';

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];

const themes: [string, Palette, GlassTokens, Rgb][] = [
  // O pior caso atrás do vidro é o oposto do véu: preto atrás do claro, branco atrás do escuro.
  ['claro', lightColors, lightGlass, BLACK],
  ['escuro', darkColors, darkGlass, WHITE],
];

type Color = Exclude<keyof Palette, 'heat' | 'hover'>;

/** Cada cor de texto e os fundos em que o app a usa. */
const pairs: [Color, Color[]][] = [
  ['ink', ['white', 'paper', 'track']],
  ['slate', ['white', 'paper', 'track']],
  // O grafite não vai sobre o trilho: ali não chega a 4,5:1.
  ['graphite', ['white', 'paper']],
  ['onSurfaceInk', ['surfaceInk']],
  ['white', ['badDark']],
  ['onInkMuted', ['surfaceInk']],
  ['accent', ['surfaceInk']],
  ['onAccent', ['accent']],
  ['danger', ['white', 'paper']],
];

describe.each(themes)('tema %s', (_name, colors, glass, worstBehind) => {
  describe('texto sobre o vidro', () => {
    for (const name of ['ink', 'slate'] as const) {
      for (const opacity of [glass.opacity, glass.fallbackOpacity]) {
        it(`${name} com véu ${opacity} tem pelo menos 4,5:1`, () => {
          const background = underWhiteVeil(worstBehind, opacity, glass.veilRgb);
          expect(contrastRatio(parseHex(colors[name]), background)).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  });

  it('a aba selecionada (texto sobre o destaque) passa com folga', () => {
    expect(contrastRatio(parseHex(colors.onAccent), parseHex(colors.accent))).toBeGreaterThan(7);
  });

  it.each(pairs.flatMap(([text, backgrounds]) => backgrounds.map((back) => [text, back])))(
    'texto %s sobre %s tem pelo menos 4,5:1',
    (text, back) => {
      const ratio = contrastRatio(parseHex(colors[text as Color]), parseHex(colors[back as Color]));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe('escolha do tema', () => {
  it('segue o sistema por padrão', () => {
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
  });

  it('sem saber o tema do sistema, fica o escuro', () => {
    expect(resolveScheme('system', null)).toBe('dark');
    expect(resolveScheme('system', undefined)).toBe('dark');
    expect(resolveScheme('system', 'unspecified')).toBe('dark');
  });

  it('a escolha do usuário vence o sistema', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});
