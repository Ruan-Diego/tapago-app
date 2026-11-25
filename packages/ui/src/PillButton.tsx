import { Pressable, StyleSheet, Text } from 'react-native';

import { MIN_TOUCH, colors, fonts, fontSizes, radii, spacing } from './tokens';

/** Botão pequeno de contorno, usado ao lado dos títulos ("+ Nova"). */
export function PillButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
});
