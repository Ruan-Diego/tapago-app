import { colors, fonts, fontSizes } from '@tapago/ui';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { pickPhoto } from '@/platform/pickPhoto';

/** Abre a escolha de foto e cuida do estado de espera e de erro. */
export function usePhotoPicker(onPick: (photo: string) => void) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function pick() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const photo = await pickPhoto();
      if (photo) onPick(photo);
    } catch (error) {
      console.warn('Não foi possível usar a foto.', error);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return { pick, busy, failed };
}

export function PhotoError({ visible }: { visible: boolean }) {
  return visible ? (
    <View>
      <Text accessibilityRole="alert" style={styles.error}>
        Não deu para usar essa foto. Tente outra.
      </Text>
    </View>
  ) : null;
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.small, color: colors.danger },
});
