import { StyleSheet, View } from 'react-native';
import type { ViewProps } from 'react-native';

import { colors, radii, spacing } from './tokens';

export interface CardProps extends ViewProps {
  /** `dashed`: cartão de atividade negativa (diferente na forma, não só na cor). */
  variant?: 'solid' | 'dashed';
}

export function Card({ variant = 'solid', style, ...rest }: CardProps) {
  return <View style={[styles.base, variant === 'dashed' && styles.dashed, style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  dashed: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: colors.graphite },
});
