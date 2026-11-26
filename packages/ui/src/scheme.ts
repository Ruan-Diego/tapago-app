/**
 * Android: o tema é decidido uma vez, quando o app abre. A escolha fica num arquivo do app (vale
 * só neste aparelho) e é lida de forma síncrona, antes de as telas montarem os estilos.
 */
import { File, Paths } from 'expo-file-system';
import { Appearance } from 'react-native';

import {
  parsePreference,
  resolveScheme,
  type ColorScheme,
  type ThemePreference,
} from './themePreference';

const FILE_NAME = 'theme-preference';

function readPreference(): ThemePreference {
  try {
    const file = new File(Paths.document, FILE_NAME);
    return parsePreference(file.exists ? file.textSync().trim() : null);
  } catch {
    return 'system';
  }
}

function systemScheme(): string | null | undefined {
  try {
    return Appearance.getColorScheme();
  } catch {
    return null;
  }
}

export const themePreference: ThemePreference = readPreference();
export const colorScheme: ColorScheme = resolveScheme(themePreference, systemScheme());

/** Grava a escolha; vale na próxima abertura (o app se reabre logo depois). */
export function saveThemePreference(preference: ThemePreference) {
  const file = new File(Paths.document, FILE_NAME);
  file.create({ overwrite: true });
  file.write(preference);
}
