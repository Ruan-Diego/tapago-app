import { initials } from '@tapago/core';
import { colors, fonts } from '@tapago/ui';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/session/store';

import { useDisplayName } from './useDisplayName';

interface AvatarProps {
  size: number;
  /** Foto ainda não salva e nome ainda não gravado, como no onboarding. */
  preview?: { photo: string | null; name: string };
}

/** A foto salva no app; sem ela, a da conta Google ou as iniciais (PROF-01). */
export function Avatar({ size, preview }: AvatarProps) {
  const saved = useSession((state) => state.avatar);
  const accountPhoto = useSession((state) => state.profile?.photoURL ?? state.user?.photoURL);
  const displayName = useDisplayName();
  const photo = preview?.photo ?? saved;
  const uri = photo ? `data:image/jpeg;base64,${photo}` : accountPhoto;
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image accessibilityIgnoresInvertColors source={{ uri }} style={circle} />;
  }
  return (
    <View style={[styles.fallback, circle]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
        {initials(preview ? preview.name : displayName) || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.surfaceInk, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.displayBold, color: colors.accent },
});
