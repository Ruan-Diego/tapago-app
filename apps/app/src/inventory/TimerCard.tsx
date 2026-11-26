import { MINUTE_MS, formatClock, formatDuration, remainingMs, type Session } from '@tapago/core';
import { PressableScale, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { endTimer, pauseTimer, resumeTimer } from '@/ledger/actions';
import { ALERT_NOTICE, BLOCKED_HINT } from '@/platform/notifications';
import { useAlertPermission } from '@/platform/useAlertPermission';
import { useNow } from '@/timer/useNow';

const SIZE = 220;
const RADIUS = 96;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** O timer rodando ou pausado, com a contagem calculada pelo horário de fim (TMR-01, 02, 03). */
export function TimerCard({ session, timeZone }: { session: Session; timeZone: string }) {
  const running = session.status === 'running';
  const now = useNow(running);
  const left = remainingMs(session, now);
  const { permission, request } = useAlertPermission();
  const ends = session.endsAt.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });

  return (
    <View style={styles.card}>
      <View style={styles.status}>
        <Text style={styles.state}>{running ? 'Rodando · tá pago' : 'Pausado'}</Text>
        <Text style={styles.ends}>{running ? `termina às ${ends}` : 'retome quando quiser'}</Text>
      </View>
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={110} cy={110} r={RADIUS} fill="none" stroke="#2E2E2B" strokeWidth={12} />
          <Circle
            cx={110}
            cy={110}
            r={RADIUS}
            fill="none"
            stroke={colors.accent}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
            strokeDashoffset={CIRCUMFERENCE * (1 - left / session.totalMs)}
            // Começa no topo do círculo.
            transform="rotate(-90 110 110)"
          />
        </Svg>
        <View role="timer" style={styles.center}>
          <Text style={styles.clock}>{formatClock(left)}</Text>
          <Text style={styles.total}>de {formatDuration(session.totalMs / MINUTE_MS)}</Text>
        </View>
      </View>
      <Text style={styles.name}>{session.itemName}</Text>
      <View style={styles.actions}>
        <PressableScale
          accessibilityRole="button"
          onPress={running ? pauseTimer : resumeTimer}
          style={[styles.button, styles.primary]}
        >
          <Text style={styles.primaryText}>{running ? 'Pausar' : 'Retomar'}</Text>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={endTimer}
          style={[styles.button, styles.outline]}
        >
          <Text style={styles.outlineText}>Encerrar</Text>
        </PressableScale>
      </View>
      {ALERT_NOTICE ? <Text style={styles.notice}>{ALERT_NOTICE}</Text> : null}
      {permission === 'default' ? (
        <Pressable accessibilityRole="button" onPress={() => void request()} style={styles.link}>
          <Text style={styles.linkText}>Ativar notificações</Text>
        </Pressable>
      ) : permission === 'denied' ? (
        <Text style={styles.notice}>{BLOCKED_HINT}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.xxl,
    backgroundColor: colors.ink,
  },
  status: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  state: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.onInkMuted,
  },
  ends: { fontFamily: fonts.body, fontSize: fontSizes.caption, color: colors.onInkMuted },
  ring: { width: SIZE, height: SIZE },
  center: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  clock: { fontFamily: fonts.monoSemiBold, fontSize: 40, letterSpacing: -1, color: colors.white },
  total: { marginTop: 4, fontFamily: fonts.body, fontSize: 12, color: colors.onInkMuted },
  name: { fontFamily: fonts.displayBold, fontSize: 22, textAlign: 'center', color: colors.white },
  actions: { alignSelf: 'stretch', flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  outline: { borderWidth: 1, borderColor: colors.graphite },
  primaryText: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.ink },
  outlineText: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.white },
  notice: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    textAlign: 'center',
    color: colors.onInkMuted,
  },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.small,
    textDecorationLine: 'underline',
    color: colors.accent,
  },
});
