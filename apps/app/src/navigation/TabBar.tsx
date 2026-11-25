import { Icon, colors, fonts, radii } from '@tapago/ui';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavItems } from './useNavItems';

/** Barra de abas do celular. */
export function TabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const items = useNavItems(props);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View accessibilityRole="tablist" accessibilityLabel="Navegação principal" style={styles.bar}>
        {items.map((item) => {
          const color = item.selected ? colors.ink : colors.onInkMuted;
          return (
            <Pressable
              key={item.route}
              accessibilityRole="tab"
              accessibilityState={{ selected: item.selected }}
              accessibilityLabel={item.label}
              onPress={item.onPress}
              style={[styles.item, item.selected && styles.selected]}
            >
              <Icon name={item.icon} color={color} />
              <Text numberOfLines={1} style={[styles.label, { color }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: colors.paper, paddingHorizontal: 10, paddingTop: 6 },
  bar: {
    height: 70,
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: 22,
    backgroundColor: colors.ink,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: radii.lg },
  selected: { backgroundColor: colors.accent },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 10 },
});
