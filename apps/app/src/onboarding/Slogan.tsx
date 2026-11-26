import { colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

/** A conversa que resume o app, usada nas boas-vindas. */
export function Slogan() {
  return (
    <View style={styles.chat}>
      <View style={styles.question}>
        <Text style={styles.questionText}>Por que você tá jogando agora?</Text>
      </View>
      <View style={styles.answer}>
        <Text style={styles.answerText}>Tá pago.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chat: { gap: spacing.sm, maxWidth: 420 },
  question: {
    alignSelf: 'flex-start',
    backgroundColor: colors.slate,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  questionText: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.onSurfaceInk },
  answer: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
  answerText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.onAccent },
});
