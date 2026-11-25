import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { colors, fonts, fontSizes, radii, spacing } from './tokens';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.graphite}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, focused && styles.focused, Boolean(error) && styles.invalid, style]}
        {...rest}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.small, color: colors.ink },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },
  focused: { borderColor: colors.ink },
  invalid: { borderColor: colors.danger },
  error: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.danger },
});
