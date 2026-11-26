import { BlurView, type BlurViewProps } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

import type { GlassProps } from './GlassProps';
import { glass, veil } from './glassTokens';

/** O desfoque do Android só é rápido o bastante a partir do 12 (API 31). */
const CAN_BLUR = Platform.OS === 'android' && Number(Platform.Version) >= 31;

/**
 * Vidro no Android (ANIM-01): desfoca o `blurTarget` e põe o véu branco por cima. Sem desfoque
 * (Android antigo, ou nada a desfocar), o fundo fica quase opaco.
 */
export function Glass({ blurTarget, style, children, ...rest }: GlassProps) {
  const blur = CAN_BLUR && blurTarget !== undefined;
  const radius = StyleSheet.flatten(style)?.borderRadius;

  return (
    <View
      {...rest}
      style={[styles.base, !blur && { backgroundColor: veil(glass.fallbackOpacity) }, style]}
    >
      {blur ? (
        <>
          <BlurView
            blurTarget={blurTarget as BlurViewProps['blurTarget']}
            blurMethod="dimezisBlurViewSdk31Plus"
            intensity={glass.intensity}
            tint={glass.tint}
            style={[styles.layer, { borderRadius: radius }]}
          />
          <View
            style={[styles.layer, { borderRadius: radius, backgroundColor: veil(glass.opacity) }]}
          />
        </>
      ) : null}
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
  },
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none' },
});
