import {
  Card,
  Tabs,
  colorScheme,
  colors,
  fonts,
  fontSizes,
  saveThemePreference,
  spacing,
  themePreference,
  type ThemePreference,
} from '@tapago/ui';
import { reloadAppAsync } from 'expo';
import { useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

import { reportError } from '@/platform/crashReports';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

/**
 * Tema do app neste aparelho: segue o sistema (padrão), claro ou escuro. As cores são montadas na
 * abertura, então trocar reabre o app na hora.
 */
export function ThemeChoice() {
  const [failed, setFailed] = useState(false);

  function choose(preference: ThemePreference) {
    if (preference === themePreference) return;
    try {
      saveThemePreference(preference);
      // Na web, recarregar a página é o mesmo que reabrir o app.
      if (Platform.OS === 'web') globalThis.location?.reload();
      else void reloadAppAsync('Tema trocado no Perfil');
    } catch (error) {
      reportError('Falha ao trocar o tema.', error);
      setFailed(true);
    }
  }

  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        Aparência
      </Text>
      <Tabs options={OPTIONS} value={themePreference} onChange={choose} />
      <Text style={styles.hint}>
        {themePreference === 'system'
          ? `Segue o tema do aparelho (agora: ${colorScheme === 'dark' ? 'escuro' : 'claro'}). Se ele não informar, fica o escuro.`
          : 'Vale só neste aparelho. Ao trocar, o app se reabre.'}
      </Text>
      {failed ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Não deu para trocar o tema. Tente de novo.
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.graphite },
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.label, color: colors.danger },
});
