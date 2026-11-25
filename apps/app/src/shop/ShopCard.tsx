import { formatDuration, formatMoney, purchaseCheck, type ShopItem } from '@tapago/core';
import { colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

/** Evita que um toque duplo compre duas vezes antes de o saldo atualizar. */
const COOLDOWN_MS = 1000;

interface ShopCardProps {
  item: ShopItem;
  /** `undefined` enquanto o perfil carrega. */
  balance: number | undefined;
  onBuy: (item: ShopItem) => void;
  onEdit: (item: ShopItem) => void;
  style?: StyleProp<ViewStyle>;
}

/** "2 h", "45 min" ou "1h 30min", com o número em destaque. */
function bigDuration(minutes: number): [string, string] {
  if (minutes < 60) return [String(minutes), 'min'];
  if (minutes % 60 === 0) return [String(minutes / 60), 'h'];
  return [formatDuration(minutes).replace('min', ''), 'min'];
}

export function ShopCard({ item, balance, onBuy, onEdit, style }: ShopCardProps) {
  const [cooling, setCooling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const { allowed, missing } = purchaseCheck(balance ?? 0, item.value);
  const canBuy = balance !== undefined && allowed;
  const [number, unit] = bigDuration(item.minutes);

  function buy() {
    setCooling(true);
    timer.current = setTimeout(() => setCooling(false), COOLDOWN_MS);
    onBuy(item);
  }

  return (
    <View style={[styles.card, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${item.name}`}
        onPress={() => onEdit(item)}
        style={styles.body}
      >
        <View style={styles.duration}>
          <Text style={styles.number}>{number}</Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>
        <Text style={styles.name}>{item.name}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          canBuy
            ? `Comprar ${item.name} por ${formatMoney(item.value)}`
            : `${item.name}: faltam ${formatMoney(missing)}`
        }
        accessibilityState={{ disabled: !canBuy || cooling }}
        disabled={!canBuy || cooling}
        onPress={buy}
        style={({ pressed }) => [
          styles.button,
          !canBuy && styles.blocked,
          (pressed || cooling) && styles.pressed,
        ]}
      >
        {canBuy ? (
          <>
            <Text style={styles.buttonText}>Comprar</Text>
            <Text style={styles.buttonText}>{formatMoney(item.value)}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.buttonText, styles.blockedText]}>{formatMoney(item.value)}</Text>
            {balance === undefined ? null : (
              <Text style={styles.missing}>faltam {formatMoney(missing)}</Text>
            )}
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    paddingTop: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  body: { flexGrow: 1, gap: spacing.md },
  duration: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  number: { fontFamily: fonts.displayBold, fontSize: 42, letterSpacing: -2, color: colors.ink },
  unit: { fontFamily: fonts.display, fontSize: 16, color: colors.graphite },
  name: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
  button: {
    minHeight: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.ink,
  },
  blocked: { backgroundColor: colors.track },
  pressed: { opacity: 0.6 },
  buttonText: { fontFamily: fonts.display, fontSize: fontSizes.label, color: colors.white },
  blockedText: { color: colors.slate },
  missing: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.slate },
});
