import { colors, fonts } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

/** O quadradinho "tá." das notificações. */
export function LogoMark() {
  return (
    <View style={styles.mark}>
      <Text style={styles.text}>
        tá<Text style={styles.dot}>.</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.white },
  dot: { color: colors.accent },
});
