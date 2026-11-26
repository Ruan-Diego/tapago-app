import { StyleSheet, Text } from 'react-native';

import { PressableScale } from './PressableScale';
import { MIN_TOUCH, colors, fonts, fontSizes, radii, spacing } from './tokens';

export interface PillButtonProps {
  label: string;
  onPress: () => void;
  /** Quando o rótulo sozinho não diz sobre o que é o botão. */
  accessibilityLabel?: string;
}

/** Botão pequeno de contorno, usado ao lado dos títulos ("+ Nova"). */
export function PillButton({ label, onPress, accessibilityLabel }: PillButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.pill}
    >
      <Text style={styles.label}>{label}</Text>
    </PressableScale>
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
  label: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
});
