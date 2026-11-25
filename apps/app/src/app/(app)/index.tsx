import { Card, Money, colors, fonts, fontSizes } from '@tapago/ui';
import { StyleSheet, Text } from 'react-native';

import { ComingSoon } from '@/navigation/ComingSoon';
import { Screen } from '@/navigation/Screen';
import { useSession } from '@/session/store';

export default function Activities() {
  const balance = useSession((state) => state.profile?.balance);

  return (
    <Screen title="Atividades">
      <Card>
        <Text style={styles.caption}>Saldo disponível</Text>
        {balance === undefined ? (
          <Text style={styles.balance}>—</Text>
        ) : (
          <Money cents={balance} style={styles.balance} />
        )}
      </Card>
      <ComingSoon>Em breve: registrar o que você faz de bom e os deslizes, com 1 toque.</ComingSoon>
    </Screen>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.graphite,
  },
  balance: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.display,
    letterSpacing: -3,
    color: colors.ink,
  },
});
