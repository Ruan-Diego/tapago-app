import { formatMoney, purchaseCheck, type ShopItem } from '@tapago/core';
import { PressableScale, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { BigDuration } from './BigDuration';

interface ShopCardProps {
  item: ShopItem;
  /** `undefined` enquanto o perfil carrega. */
  balance: number | undefined;
  onBuy: (item: ShopItem) => void;
  onEdit: (item: ShopItem) => void;
  style?: StyleProp<ViewStyle>;
}

export function ShopCard({ item, balance, onBuy, onEdit, style }: ShopCardProps) {
  const { allowed, missing } = purchaseCheck(balance ?? 0, item.value);
  const canBuy = balance !== undefined && allowed;

  return (
    <View style={[styles.card, style]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`Editar ${item.name}`}
        onPress={() => onEdit(item)}
        style={styles.body}
      >
        <BigDuration minutes={item.minutes} />
        <Text style={styles.name}>{item.name}</Text>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          canBuy
            ? `Comprar ${item.name} por ${formatMoney(item.value)}`
            : `${item.name}: faltam ${formatMoney(missing)}`
        }
        accessibilityState={{ disabled: !canBuy }}
        disabled={!canBuy}
        onPress={() => onBuy(item)}
        style={[styles.button, !canBuy && styles.blocked]}
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
      </PressableScale>
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
  buttonText: { fontFamily: fonts.display, fontSize: fontSizes.label, color: colors.white },
  blockedText: { color: colors.slate },
  missing: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.slate },
});
