import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { colors } from './tokens';

/**
 * Preenchimento listrado do que é ruim nos gráficos: diferencia pela forma, não só pela cor. O
 * tamanho e os cantos vêm do `style`.
 */
export function Stripes({ style }: { style?: StyleProp<ViewStyle> }) {
  // Os ids do React têm caracteres que não valem dentro de `url(#…)`.
  const id = `stripes${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View style={[styles.clip, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={id}
            width={6}
            height={6}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <Rect width={6} height={6} fill={colors.badLight} />
            <Rect width={3} height={6} fill={colors.badDark} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
