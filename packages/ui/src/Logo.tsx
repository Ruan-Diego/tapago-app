import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from './tokens';

/** "Tá pago" com o ponto destacado. */
export function Logo({ size = 22, inverse = false }: { size?: number; inverse?: boolean }) {
  const dot = Math.max(5, Math.round(size * 0.22));
  return (
    <View accessible accessibilityLabel="Tá pago" style={styles.row}>
      <Text
        style={[
          styles.text,
          { fontSize: size, letterSpacing: -0.03 * size },
          inverse && styles.inverse,
        ]}
      >
        Tá pago
      </Text>
      <View
        style={[
          styles.dot,
          { width: dot + 3, height: dot + 3, marginBottom: Math.round(size * 0.2) },
        ]}
      >
        <View style={[styles.dotInk, { width: dot - 1, height: dot - 1 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  text: { fontFamily: fonts.displayBold, color: colors.ink },
  inverse: { color: colors.onSurfaceInk },
  dot: {
    marginLeft: 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInk: { backgroundColor: colors.surfaceInk, borderRadius: 99 },
});
