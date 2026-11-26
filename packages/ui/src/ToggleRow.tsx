import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSizes, radii, spacing } from './tokens';

export interface ToggleRowProps {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** Linha com chave liga/desliga; a linha inteira é o alvo de toque. */
export function ToggleRow({ label, hint, value, onChange }: ToggleRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.track,
  },
  texts: { flex: 1, minWidth: 0 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  hint: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.graphite,
  },
  track: {
    width: 48,
    height: 28,
    padding: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.badLight,
  },
  trackOn: { backgroundColor: colors.toggleOn },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.onSurfaceInk },
  knobOn: { alignSelf: 'flex-end' },
});
