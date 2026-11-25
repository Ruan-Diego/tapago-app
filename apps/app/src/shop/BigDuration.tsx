import { formatDuration } from '@tapago/core';
import { colors, fonts } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

/** "2 h", "45 min" ou "1h 30 min", com o número em destaque. */
function parts(minutes: number): [string, string] {
  if (minutes < 60) return [String(minutes), 'min'];
  if (minutes % 60 === 0) return [String(minutes / 60), 'h'];
  return [formatDuration(minutes).replace('min', ''), 'min'];
}

export function BigDuration({ minutes, size = 42 }: { minutes: number; size?: number }) {
  const [number, unit] = parts(minutes);
  return (
    <View style={styles.row}>
      <Text style={[styles.number, { fontSize: size, letterSpacing: -size / 20 }]}>{number}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  number: { fontFamily: fonts.displayBold, color: colors.ink },
  unit: { fontFamily: fonts.display, fontSize: 15, color: colors.graphite },
});
