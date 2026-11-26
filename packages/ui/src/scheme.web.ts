/** Web: a escolha fica no `localStorage` deste navegador; o sistema vem do `prefers-color-scheme`. */
import {
  parsePreference,
  resolveScheme,
  type ColorScheme,
  type ThemePreference,
} from './themePreference';

const KEY = 'tapago:theme';

function readPreference(): ThemePreference {
  try {
    return parsePreference(globalThis.localStorage?.getItem(KEY));
  } catch {
    return 'system';
  }
}

function systemScheme(): string | null {
  try {
    const query = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return null;
    if (query.matches) return 'dark';
    return globalThis.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : null;
  } catch {
    return null;
  }
}

export const themePreference: ThemePreference = readPreference();
export const colorScheme: ColorScheme = resolveScheme(themePreference, systemScheme());

export function saveThemePreference(preference: ThemePreference) {
  globalThis.localStorage?.setItem(KEY, preference);
}
