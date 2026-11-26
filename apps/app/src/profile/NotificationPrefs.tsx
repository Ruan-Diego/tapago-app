import type { UserProfile } from '@tapago/core';
import { profileRepository } from '@tapago/data';
import {
  Button,
  Card,
  MIN_TOUCH,
  ToggleRow,
  colors,
  fonts,
  fontSizes,
  radii,
  spacing,
} from '@tapago/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { save } from '@/ledger/actions';
import { ALERT_NOTICE, BLOCKED_HINT } from '@/platform/notifications';
import { REMINDERS_HERE } from '@/platform/reminders';
import { useAlertPermission } from '@/platform/useAlertPermission';

type Notif = UserProfile['notif'];
type Pref = 'end' | 'warn5' | 'weekly' | 'daily';

const ANDROID_ONLY = REMINDERS_HERE ? '' : ' Chega no celular Android.';

const PREFS: { key: Pref; label: string; hint: string }[] = [
  { key: 'end', label: 'Quando o tempo acabar', hint: 'Aviso no fim de cada timer de lazer' },
  { key: 'warn5', label: '5 minutos antes', hint: 'Pra você se preparar pra parar' },
  {
    key: 'weekly',
    label: 'Resumo semanal',
    hint: `Domingo às 20h, abrindo o Histórico.${ANDROID_ONLY}`,
  },
  {
    key: 'daily',
    label: 'Lembrete diário',
    hint: `Um toque por dia para registrar o que fez.${ANDROID_ONLY}`,
  },
];

const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}h`;

/** Preferências de aviso, que valem em todos os aparelhos (PROF-02). */
export function NotificationPrefs({ uid, notif }: { uid: string; notif: Notif }) {
  const { permission, request } = useAlertPermission();
  const wantsAlerts = notif.end || notif.warn5 || (REMINDERS_HERE && (notif.weekly || notif.daily));

  function ask() {
    request().catch((error: unknown) => {
      console.warn('Não foi possível pedir a permissão de notificação.', error);
    });
  }

  function write(next: Notif) {
    save(profileRepository.update(uid, { notif: next }));
  }

  function change(key: Pref, value: boolean) {
    // Ligar um aviso é o momento de pedir a permissão do aparelho.
    const local = key === 'end' || key === 'warn5' || REMINDERS_HERE;
    if (value && local && permission === 'default') ask();
    write({ ...notif, [key]: value });
  }

  function shiftHour(amount: number) {
    write({ ...notif, dailyHour: (notif.dailyHour + amount + 24) % 24 });
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
      {notif.daily ? (
        <View style={styles.hourRow}>
          <Text style={styles.hourLabel}>Horário do lembrete</Text>
          <View style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Uma hora mais cedo"
              onPress={() => shiftHour(-1)}
              style={styles.step}
            >
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={styles.hour}>
              {hourLabel(notif.dailyHour)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Uma hora mais tarde"
              onPress={() => shiftHour(1)}
              style={styles.step}
            >
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  hourLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.label, color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink },
  hour: {
    minWidth: 44,
    textAlign: 'center',
    fontFamily: fonts.monoSemiBold,
    fontSize: fontSizes.label,
    color: colors.ink,
  },
  hint: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    color: colors.graphite,
  },
});
