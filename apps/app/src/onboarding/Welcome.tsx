import { colors, fonts } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

import { Slogan } from './Slogan';

/** Boas-vindas (ONB-01), sobre fundo escuro. */
export function Welcome({ chat }: { chat: boolean }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.mark}>
        <Text style={styles.markText}>
          tá<Text style={styles.markDot}>.</Text>
        </Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Tá pago<Text style={styles.accent}>.</Text>
      </Text>
      <Text style={styles.text}>
        Um app pra trocar esforço por lazer. Faça o que é bom, evite o que é ruim, compre seu tempo
        livre — sem culpa.
      </Text>
      {chat ? <Slogan /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexGrow: 1, justifyContent: 'center', gap: 28, paddingVertical: 32 },
  mark: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { fontFamily: fonts.displayBold, fontSize: 38, letterSpacing: -2, color: colors.ink },
  markDot: { backgroundColor: colors.accent, color: colors.onAccent },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 64,
    lineHeight: 66,
    letterSpacing: -3,
    color: colors.onSurfaceInk,
  },
  accent: { color: colors.accent },
  text: { fontFamily: fonts.body, fontSize: 18, lineHeight: 27, color: colors.onInkMuted },
});
