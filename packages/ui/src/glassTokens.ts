/** Tokens do vidro (ANIM-01, 03) do tema ativo: desfoque, opacidade, borda, brilho e sombra. */
import { darkGlass, lightGlass, type GlassTokens } from './palettes';
import { colorScheme } from './scheme';

export const glass: GlassTokens = colorScheme === 'dark' ? darkGlass : lightGlass;

/** Cor do véu do vidro: branco no tema claro, quase preto no escuro. */
export const veil = (opacity: number) => `rgba(${glass.veilRgb.join(',')},${opacity})`;
