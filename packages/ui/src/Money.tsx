import { formatMoney } from '@tapago/core';
import { StyleSheet, Text } from 'react-native';
import type { TextProps } from 'react-native';

import { colors, fonts } from './tokens';

export interface MoneyProps extends TextProps {
  /** Valor em centavos (R1). */
  cents: number;
}

export function Money({ cents, style, ...rest }: MoneyProps) {
  return (
    <Text style={[styles.value, style]} {...rest}>
      {formatMoney(cents)}
    </Text>
  );
}

const styles = StyleSheet.create({
  value: { fontFamily: fonts.displayBold, color: colors.ink, fontVariant: ['tabular-nums'] },
});
