import { Appear, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAlertBanner } from './store';

const DURATION_MS = 12_000;

/** O aviso dentro do app ou da página, no topo da tela. */
export function AlertBanner() {
  const alert = useAlertBanner((state) => state.alert);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => useAlertBanner.setState({ alert: null }), DURATION_MS);
    return () => clearTimeout(timer);
  }, [alert]);

  if (!alert) return null;

  return (
    <Appear from="above" style={[styles.region, { top: insets.top + spacing.md }]}>
      <View accessibilityLiveRegion="assertive" role="alert" style={styles.banner}>
        <View style={styles.mark}>
          <Text style={styles.markText}>
            tá<Text style={styles.markDot}>.</Text>
          </Text>
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.body}>{alert.body}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dispensar aviso"
          onPress={() => useAlertBanner.setState({ alert: null })}
          style={styles.close}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </Appear>
  );
}

const styles = StyleSheet.create({
  region: { position: 'absolute', alignSelf: 'center', width: '94%', maxWidth: 420 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.white },
  markDot: { color: colors.accent },
  texts: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  body: { marginTop: 2, fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.slate },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, color: colors.graphite },
});
