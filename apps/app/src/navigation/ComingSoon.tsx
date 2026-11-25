import { Card, colors, fonts, fontSizes } from '@tapago/ui';
import { StyleSheet, Text } from 'react-native';

/** Marcador das abas que ganham conteúdo nas próximas fases. */
export function ComingSoon({ children }: { children: string }) {
  return (
    <Card variant="dashed">
      <Text style={styles.text}>{children}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.body, fontSize: fontSizes.label, lineHeight: 21, color: colors.slate },
});
