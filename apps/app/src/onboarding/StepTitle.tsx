import { colors, fonts, fontSizes } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

export function StepTitle({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.wrapper}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6, marginTop: 12, marginBottom: 20 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.4,
    color: colors.ink,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    lineHeight: 21,
    color: colors.graphite,
  },
});
