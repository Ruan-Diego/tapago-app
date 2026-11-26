/** Contraste WCAG entre cores `#RRGGBB`, para conferir o texto sobre o vidro (ANIM-05). */
export type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(color: Rgb): number {
  const [r, g, b] = color.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** A cor que se vê com um véu `veil` (branco, por padrão) de opacidade `opacity` sobre `behind`. */
export function underWhiteVeil(
  behind: Rgb,
  opacity: number,
  veil: readonly [number, number, number] = [255, 255, 255],
): Rgb {
  return behind.map(
    (channel, index) => (veil[index] ?? 255) * opacity + channel * (1 - opacity),
  ) as Rgb;
}
