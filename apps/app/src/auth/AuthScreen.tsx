import { Logo, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AuthScreenProps {
  title: string;
  subtitle: string;
  error?: string | null;
  children: ReactNode;
}

/** Moldura das telas de entrar, criar conta e recuperar senha. */
export function AuthScreen({ title, subtitle, error, children }: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Logo size={40} />
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            {error ? (
              <View accessibilityLiveRegion="assertive" accessibilityRole="alert">
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  content: { width: '100%', maxWidth: 400, gap: spacing.lg },
  heading: { gap: spacing.xs, marginTop: spacing.sm },
  title: { fontFamily: fonts.displayBold, fontSize: fontSizes.heading, color: colors.ink },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: 22,
    color: colors.slate,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.label,
    color: colors.danger,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    padding: spacing.md,
  },
});
