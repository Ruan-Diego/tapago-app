import { formatMoney } from '@tapago/core';
import { MIN_TOUCH, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface PresetRowProps {
  name: string;
  detail: string;
  value: number;
  /** `+`, `−` ou nada (loja). */
  sign: '+' | '−' | '';
  selected: boolean;
  onToggle: () => void;
  onStep: (direction: 1 | -1) => void;
}

/** Uma sugestão: marcar, e ajustar o valor com −/+ (ONB-03, ONB-04). */
export function PresetRow({
  name,
  detail,
  value,
  sign,
  selected,
  onToggle,
  onStep,
}: PresetRowProps) {
  const negative = sign === '−';

  return (
    <View style={[styles.row, negative && styles.negative, selected && styles.selected]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={name}
        accessibilityState={{ checked: selected }}
        aria-checked={selected}
        onPress={onToggle}
        style={styles.main}
      >
        <View style={[styles.box, selected && styles.boxOn]}>
          {selected ? <Text style={styles.check}>✓</Text> : null}
        </View>
        <View style={styles.texts}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.detail}>{detail}</Text>
        </View>
      </Pressable>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Diminuir o valor de ${name}`}
          onPress={() => onStep(-1)}
          style={styles.step}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.value}>
          {sign}
          {formatMoney(value)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Aumentar o valor de ${name}`}
          onPress={() => onStep(1)}
          style={styles.step}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  negative: { borderStyle: 'dashed' },
  selected: { borderColor: colors.ink },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.surfaceInk },
  check: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 16, color: colors.onSurfaceInk },
  texts: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
  detail: { fontFamily: fonts.body, fontSize: fontSizes.caption, color: colors.graphite },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  step: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.body, fontSize: 20, color: colors.ink },
  value: {
    minWidth: 52,
    textAlign: 'center',
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.ink,
  },
});
