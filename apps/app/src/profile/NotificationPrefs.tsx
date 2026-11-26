import type { UserProfile } from '@tapago/core';
import { profileRepository } from '@tapago/data';
import { Button, Card, ToggleRow, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { StyleSheet, Text } from 'react-native';

import { save } from '@/ledger/actions';
import { ALERT_NOTICE, BLOCKED_HINT } from '@/platform/notifications';
import { useAlertPermission } from '@/platform/useAlertPermission';

type Pref = keyof UserProfile['notif'];

const PREFS: { key: Pref; label: string; hint: string }[] = [
  { key: 'end', label: 'Quando o tempo acabar', hint: 'Aviso no fim de cada timer de lazer' },
  { key: 'warn5', label: '5 minutos antes', hint: 'Pra você se preparar pra parar' },
  {
    key: 'weekly',
    label: 'Resumo semanal',
    hint: 'Domingo à noite. Fica salvo; o aviso chega em uma próxima versão',
  },
];

/** Preferências de aviso, que valem em todos os aparelhos (PROF-02). */
export function NotificationPrefs({ uid, notif }: { uid: string; notif: UserProfile['notif'] }) {
  const { permission, request } = useAlertPermission();
  const wantsAlerts = notif.end || notif.warn5;

  function ask() {
    request().catch((error: unknown) => {
      console.warn('Não foi possível pedir a permissão de notificação.', error);
    });
  }

  function change(key: Pref, value: boolean) {
    // Ligar um aviso é o momento de pedir a permissão do aparelho.
    if (value && key !== 'weekly' && permission === 'default') ask();
    save(profileRepository.update(uid, { notif: { ...notif, [key]: value } }));
  }

  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={styles.caption}>
        Notificações
      </Text>
      {PREFS.map((pref) => (
        <ToggleRow
          key={pref.key}
          label={pref.label}
          hint={pref.hint}
          value={notif[pref.key]}
          onChange={(value) => change(pref.key, value)}
        />
      ))}
      {wantsAlerts && permission === 'default' ? (
        <Button label="Permitir neste aparelho" variant="outline" onPress={ask} />
      ) : null}
      {wantsAlerts && permission === 'denied' ? (
        <Text style={styles.hint}>{BLOCKED_HINT}</Text>
      ) : null}
      {ALERT_NOTICE ? <Text style={styles.hint}>{ALERT_NOTICE}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  caption: {
    marginBottom: spacing.xs,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.graphite,
  },
  hint: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    color: colors.graphite,
  },
});
