import { formatMoney } from '@tapago/core';
import { StyleSheet, Text } from 'react-native';
import type { TextProps } from 'react-native';

import { colors, fonts } from './tokens';
import { useCountUp } from './useCountUp';

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

/** O saldo: conta até o novo valor quando ele muda. */
export function CountingMoney({ cents, ...rest }: MoneyProps) {
  // O saldo anda em reais inteiros na tela: a contagem não mostra centavos que não existem.
  const shown = useCountUp(cents);
  const whole = cents % 100 === 0;
  return <Money cents={whole ? Math.round(shown / 100) * 100 : shown} {...rest} />;
}

const styles = StyleSheet.create({
  value: { fontFamily: fonts.displayBold, color: colors.ink, fontVariant: ['tabular-nums'] },
});
