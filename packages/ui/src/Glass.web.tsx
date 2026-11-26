import { StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import type { GlassProps } from './GlassProps';
import { glass, veil } from './glassTokens';

const FILTER = `blur(${glass.blur}px) saturate(${glass.saturate})`;

const CAN_BLUR =
  typeof CSS !== 'undefined' &&
  (CSS.supports('backdrop-filter', FILTER) || CSS.supports('-webkit-backdrop-filter', FILTER));

/**
 * Vidro na web (ANIM-01, 03): `backdrop-filter` com o véu branco. Onde o navegador não suporta, o
 * fundo fica quase opaco. O `blurTarget` é só do Android.
 */
export function Glass({ blurTarget: _blurTarget, style, children, ...rest }: GlassProps) {
  return (
    <View {...rest} style={[styles.base, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glass.edge,
    boxShadow: `${glass.shadow}, ${glass.highlight}`,
    backgroundColor: veil(CAN_BLUR ? glass.opacity : glass.fallbackOpacity),
    // O React Native não tipa o desfoque, mas o navegador entende.
    ...({ backdropFilter: FILTER, WebkitBackdropFilter: FILTER } as ViewStyle),
  },
});
