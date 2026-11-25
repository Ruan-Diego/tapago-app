import { formatDuration, formatMoney, type ShopItem } from '@tapago/core';
import { Icon, PlayIcon, Sheet, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLedger } from '@/ledger/store';

interface PurchaseSheetProps {
  item: ShopItem;
  onChoose: (useNow: boolean) => void;
  onClose: () => void;
}

/** "Usar agora" ou "Guardar no inventário" (SHOP-03, R4). */
export function PurchaseSheet({ item, onChoose, onClose }: PurchaseSheetProps) {
  const timer = useLedger((state) => state.timer);
  const chosen = useRef(false);
  const session = timer?.session;
  // Um timer por vez (R5).
  const canUseNow = timer !== null && !session;

  /** Um toque duplo não compra duas vezes. */
  function choose(useNow: boolean) {
    if (chosen.current) return;
    chosen.current = true;
    onChoose(useNow);
  }

  const useNowText = canUseNow
    ? `O timer de ${formatDuration(item.minutes)} começa na hora. A gente avisa quando acabar.`
    : session
      ? `Já tem um timer rodando (${session.itemName}). Guarde este pra depois.`
      : 'Conferindo o timer…';

  return (
    <Sheet title={item.name} onClose={onClose}>
      <Text style={styles.question}>
        Comprar por {formatMoney(item.value)}. Vai usar agora ou guardar pra depois?
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canUseNow }}
        disabled={!canUseNow}
        onPress={() => choose(true)}
        style={({ pressed }) => [
          styles.option,
          canUseNow ? styles.primary : styles.blocked,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.iconBox, canUseNow ? styles.iconAccent : styles.iconBlocked]}>
          <PlayIcon color={canUseNow ? colors.ink : colors.slate} size={20} />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, canUseNow ? styles.onInk : styles.muted]}>Usar agora</Text>
          <Text style={[styles.detail, canUseNow ? styles.onInkMuted : styles.muted]}>
            {useNowText}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => choose(false)}
        style={({ pressed }) => [styles.option, styles.secondary, pressed && styles.pressed]}
      >
        <View style={[styles.iconBox, styles.iconPaper]}>
          <Icon name="inventory" color={colors.ink} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>Guardar no inventário</Text>
          <Text style={[styles.detail, styles.graphite]}>
            Fica pago. Você começa quando quiser.
          </Text>
        </View>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  question: { fontFamily: fonts.body, fontSize: 15, color: colors.slate },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  primary: { backgroundColor: colors.ink, borderColor: colors.ink },
  blocked: { backgroundColor: colors.track, borderColor: colors.track },
  secondary: { backgroundColor: colors.white, borderColor: colors.ink },
  pressed: { opacity: 0.8 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAccent: { backgroundColor: colors.accent },
  iconBlocked: { backgroundColor: colors.badLight },
  iconPaper: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.borderStrong },
  texts: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  detail: { marginTop: 2, fontFamily: fonts.body, fontSize: fontSizes.small },
  onInk: { color: colors.white },
  onInkMuted: { color: colors.onInkMuted },
  muted: { color: colors.slate },
  graphite: { color: colors.graphite },
});
