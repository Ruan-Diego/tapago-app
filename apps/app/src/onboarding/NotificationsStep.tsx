import { colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

import { ALERT_NOTICE } from '@/platform/notifications';

import { LogoMark } from './LogoMark';
import { StepTitle } from './StepTitle';

const EXAMPLES = [
  { title: 'Faltam 5 minutos', text: 'Jogar 1 hora termina às 21:40.' },
  { title: 'Tempo esgotado', text: 'Acabou: Jogar 1 hora. Bora voltar pras atividades?' },
];

/** A explicação antes do pedido de permissão do sistema (ONB-05). */
export function NotificationsStep() {
  return (
    <>
      <StepTitle title={'A gente avisa\nquando acabar.'}>
        Comprou 1 hora de jogo? O timer roda e você é avisado 5 minutos antes e quando o tempo
        acabar. Ninguém precisa ficar de olho no relógio.
      </StepTitle>
      <View style={styles.examples}>
        {EXAMPLES.map((example) => (
          <View key={example.title} style={styles.example}>
            <LogoMark />
            <View style={styles.texts}>
              <Text style={styles.title}>{example.title}</Text>
              <Text style={styles.text}>{example.text}</Text>
            </View>
          </View>
        ))}
      </View>
      {ALERT_NOTICE ? <Text style={styles.notice}>{ALERT_NOTICE}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  examples: { backgroundColor: colors.track, borderRadius: radii.xxl, padding: 18, gap: 10 },
  example: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  texts: { flex: 1 },
  title: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
  text: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.slate },
  notice: {
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    color: colors.graphite,
  },
});
