import { Button, Card, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/navigation/Screen';
import { Avatar } from '@/profile/Avatar';
import { useDisplayName } from '@/profile/useDisplayName';
import { signOut } from '@/session/signOut';
import { useSession } from '@/session/store';

export default function Profile() {
  const email = useSession((state) => state.user?.email);
  const name = useDisplayName();
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function leave() {
    setLeaving(true);
    setFailed(false);
    try {
      await signOut();
    } catch (error) {
      console.error('Falha ao sair.', error);
      setFailed(true);
    } finally {
      setLeaving(false);
    }
  }

  return (
    <Screen title="Perfil">
      <Card style={styles.identity}>
        <Avatar size={56} />
        <View style={styles.texts}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {email ? (
            <Text numberOfLines={1} style={styles.email}>
              {email}
            </Text>
          ) : null}
        </View>
      </Card>
      {failed ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Não deu para sair. Tente de novo.
        </Text>
      ) : null}
      <Button label="Sair" variant="outline" loading={leaving} onPress={() => void leave()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  texts: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.display, fontSize: fontSizes.title, color: colors.ink },
  email: { fontFamily: fonts.body, fontSize: fontSizes.label, color: colors.graphite },
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.label, color: colors.danger },
});
