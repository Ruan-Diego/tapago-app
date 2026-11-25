import { MIN_TOUCH, colors, fonts, fontSizes } from '@tapago/ui';
import { Link, type Href } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

export function TextLink({ href, label }: { href: Href; label: string }) {
  return (
    <Link href={href} style={styles.link}>
      <Text style={styles.label}>{label}</Text>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: MIN_TOUCH, alignSelf: 'center', paddingVertical: 12 },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.label,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
});
