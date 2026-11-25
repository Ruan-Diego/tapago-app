import { initials } from '@tapago/core';
import { colors, fonts } from '@tapago/ui';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/session/store';

import { useDisplayName } from './useDisplayName';

/** Foto da conta Google ou as iniciais. A foto própria entra na F3 (PROF-01). */
export function Avatar({ size }: { size: number }) {
  const photoURL = useSession((state) => state.profile?.photoURL ?? state.user?.photoURL);
  const name = useDisplayName();
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (photoURL) {
    return <Image accessibilityIgnoresInvertColors source={{ uri: photoURL }} style={circle} />;
  }
  return (
    <View style={[styles.fallback, circle]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.displayBold, color: colors.accent },
});
