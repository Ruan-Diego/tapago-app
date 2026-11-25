import { colors, fonts, fontSizes } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  children?: string;
}

/** Abertura das telas: rótulo pequeno, frase grande e uma linha de apoio. */
export function PageHeading({ eyebrow, title, children }: PageHeadingProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {children ? <Text style={styles.text}>{children}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.graphite,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1.4,
    color: colors.ink,
  },
  text: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.graphite,
  },
});
