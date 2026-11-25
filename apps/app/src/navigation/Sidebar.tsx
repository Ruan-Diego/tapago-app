import { Icon, Logo, Money, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/profile/Avatar';
import { useDisplayName } from '@/profile/useDisplayName';
import { useSession } from '@/session/store';
import { MiniTimer } from '@/timer/MiniTimer';

import { useNavItems } from './useNavItems';

/** Menu lateral da web em telas largas. */
export function Sidebar(props: BottomTabBarProps) {
  const items = useNavItems(props);
  const balance = useSession((state) => state.profile?.balance);
  const email = useSession((state) => state.user?.email);
  const name = useDisplayName();

  return (
    <View style={styles.aside}>
      <View style={styles.logo}>
        <Logo size={26} />
      </View>
      <View style={styles.balance}>
        <Text style={styles.balanceCaption}>Saldo</Text>
        {balance === undefined ? (
          <Text style={styles.balanceValue}>—</Text>
        ) : (
          <Money cents={balance} style={styles.balanceValue} />
        )}
      </View>
      <View accessibilityRole="tablist" accessibilityLabel="Navegação principal" style={styles.nav}>
        {items.map((item) => {
          const color = item.selected ? colors.white : colors.slate;
          return (
            <Pressable
              key={item.route}
              accessibilityRole="tab"
              accessibilityState={{ selected: item.selected }}
              onPress={item.onPress}
              style={[styles.item, item.selected && styles.selected]}
            >
              <Icon name={item.icon} color={color} size={20} />
              <Text style={[styles.itemLabel, { color }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {items.some((item) => item.selected && item.route === 'inventory') ? null : <MiniTimer />}
      <View style={styles.footer}>
        <Avatar size={40} />
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {email ? (
            <Text numberOfLines={1} style={styles.email}>
              {email}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  aside: {
    width: 264,
    height: '100%',
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: 22,
  },
  logo: { paddingHorizontal: spacing.sm },
  balance: { backgroundColor: colors.ink, borderRadius: radii.xl, padding: spacing.lg },
  balanceCaption: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.onInkMuted,
  },
  balanceValue: { fontFamily: fonts.displayBold, fontSize: 34, color: colors.white, marginTop: 4 },
  nav: { gap: 4 },
  item: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  selected: { backgroundColor: colors.ink },
  itemLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15 },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.sm,
  },
  identity: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
  email: { fontFamily: fonts.body, fontSize: fontSizes.caption, color: colors.graphite },
});
