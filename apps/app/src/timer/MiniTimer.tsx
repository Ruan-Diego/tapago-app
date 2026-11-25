import { formatClock, remainingMs } from '@tapago/core';
import { PlayIcon, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLedger } from '@/ledger/store';

import { useNow } from './useNow';

/** O timer visível nas outras abas; o toque leva ao Inventário (TMR-04). */
export function MiniTimer() {
  const session = useLedger((state) => state.timer?.session);
  const now = useNow(session?.status === 'running');
  if (!session) return null;

  const clock = formatClock(remainingMs(session, now));
  const paused = session.status === 'paused';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Timer: ${session.itemName}, faltam ${clock}${paused ? ', pausado' : ''}`}
      onPress={() => router.navigate('/inventory')}
      style={({ pressed }) => [styles.mini, pressed && styles.pressed]}
    >
      {paused ? (
        <View style={styles.pause}>
          <View style={styles.bar} />
          <View style={styles.bar} />
        </View>
      ) : (
        <PlayIcon color={colors.ink} size={16} />
      )}
      <Text numberOfLines={1} style={styles.name}>
        {session.itemName}
      </Text>
      <Text style={styles.clock}>{clock}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mini: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  pressed: { opacity: 0.8 },
  pause: { width: 16, flexDirection: 'row', justifyContent: 'center', gap: 3 },
  bar: { width: 4, height: 14, borderRadius: 1, backgroundColor: colors.ink },
  name: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
  clock: { fontFamily: fonts.monoSemiBold, fontSize: 15, color: colors.ink },
});
