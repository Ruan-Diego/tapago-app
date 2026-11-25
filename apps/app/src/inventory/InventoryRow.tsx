import { formatMoney, type InventoryItem } from '@tapago/core';
import { PlayIcon, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { whenLabel } from '@/history/whenLabel';
import { BigDuration } from '@/shop/BigDuration';

interface InventoryRowProps {
  item: InventoryItem;
  today: string;
  timeZone: string;
  /** Falso com um timer em andamento (R5). */
  canStart: boolean;
  onStart: (item: InventoryItem) => void;
}

/** Item guardado: quando foi comprado, quanto custou e o botão de começar (INV-01, 02). */
export function InventoryRow({ item, today, timeZone, canStart, onStart }: InventoryRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.duration}>
        <BigDuration minutes={item.minutes} size={32} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.bought}>
          Comprado {whenLabel(item.purchasedAt, today, timeZone)} · {formatMoney(item.value)}
        </Text>
      </View>
      {canStart ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Começar ${item.name}`}
          onPress={() => onStart(item)}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <PlayIcon color={colors.accent} size={14} />
          <Text style={styles.buttonText}>Começar</Text>
        </Pressable>
      ) : (
        <Text style={styles.blocked}>Termine o timer atual</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  duration: { minWidth: 60 },
  texts: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  bought: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.graphite,
  },
  button: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
  },
  pressed: { opacity: 0.8 },
  buttonText: { fontFamily: fonts.display, fontSize: 15, color: colors.white },
  blocked: {
    maxWidth: 90,
    textAlign: 'right',
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    color: colors.slate,
  },
});
