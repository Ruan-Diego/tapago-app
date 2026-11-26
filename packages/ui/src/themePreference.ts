/** Escolha de tema deste aparelho: seguir o sistema (padrão), claro ou escuro. */
export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export function parsePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/**
 * O tema que vale. Seguindo o sistema, sem saber o que ele usa (`null`, "unspecified"), fica o
 * escuro.
 */
export function resolveScheme(
  preference: ThemePreference,
  system: string | null | undefined,
): ColorScheme {
  if (preference !== 'system') return preference;
  return system === 'light' ? 'light' : 'dark';
}
