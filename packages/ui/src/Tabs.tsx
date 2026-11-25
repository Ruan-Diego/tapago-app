import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH, colors, fonts, fontSizes, radii } from './tokens';

export interface TabsProps<Value extends string> {
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}

/** Abas segmentadas, para alternar entre visões dentro de uma tela. */
export function Tabs<Value extends string>({ options, value, onChange }: TabsProps<Value>) {
  return (
    <View accessibilityRole="tablist" style={styles.list}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.tab, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    backgroundColor: colors.track,
    borderRadius: radii.pill,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.ink },
  label: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.slate },
  selectedLabel: { color: colors.white },
});
