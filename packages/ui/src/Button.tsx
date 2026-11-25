import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import { MIN_TOUCH, colors, fonts, radii, spacing } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  /** `primary`: tinta · `secondary`: branco com borda suave · `outline`: contorno de tinta. */
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  icon,
  style,
  ...rest
}: ButtonProps) {
  const inactive = Boolean(disabled) || loading;
  const textColor = variant === 'primary' ? colors.white : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    minWidth: MIN_TOUCH,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  primary: { backgroundColor: colors.ink, borderColor: colors.ink },
  secondary: { backgroundColor: colors.white, borderColor: colors.borderStrong },
  outline: { backgroundColor: 'transparent', borderColor: colors.ink },
  pressed: { opacity: 0.8 },
  inactive: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontFamily: fonts.displayBold, fontSize: 16 },
});
