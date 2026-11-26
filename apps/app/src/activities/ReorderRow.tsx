import type { Activity } from '@tapago/core';
import { MIN_TOUCH, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ReorderRowProps {
  activity: Activity;
  number: string;
  first: boolean;
  last: boolean;
  onMove: (activity: Activity, direction: -1 | 1) => void;
}

/** Uma atividade no modo de ordenar (ACT-06): subir ou descer uma casa na lista. */
export function ReorderRow({ activity, number, first, last, onMove }: ReorderRowProps) {
  const negative = activity.kind === 'negative';
  return (
    <View style={[styles.row, negative && styles.negative]}>
      <Text style={styles.number}>{number}</Text>
      <Text numberOfLines={1} style={styles.name}>
        {activity.name}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Subir ${activity.name}`}
        accessibilityState={{ disabled: first }}
        disabled={first}
        onPress={() => onMove(activity, -1)}
        style={[styles.arrow, first && styles.disabled]}
      >
        <Text style={styles.arrowText}>↑</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Descer ${activity.name}`}
        accessibilityState={{ disabled: last }}
        disabled={last}
        onPress={() => onMove(activity, 1)}
        style={[styles.arrow, last && styles.disabled]}
      >
        <Text style={styles.arrowText}>↓</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  negative: { borderStyle: 'dashed', borderColor: colors.borderStrong },
  number: { fontFamily: fonts.mono, fontSize: fontSizes.caption, color: colors.graphite },
  name: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  arrow: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  arrowText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.ink },
});
