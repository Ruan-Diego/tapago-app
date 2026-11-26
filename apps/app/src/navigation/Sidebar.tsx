import {
  CountingMoney,
  Glass,
  Icon,
  Logo,
  colors,
  fonts,
  fontSizes,
  radii,
  spacing,
  useDrop,
} from '@tapago/ui';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Avatar } from '@/profile/Avatar';
import { useDisplayName } from '@/profile/useDisplayName';
import { useSession } from '@/session/store';
import { MiniTimer } from '@/timer/MiniTimer';

import { useArrowKeys } from './useArrowKeys';
import { useNavItems } from './useNavItems';

const ITEM = 48;
const STEP = ITEM + 4;

/** Menu lateral da web em telas largas: painel de vidro com a seleção em gota (ANIM-03). */
export function Sidebar(props: BottomTabBarProps) {
  const items = useNavItems(props);
  const balance = useSession((state) => state.profile?.balance);
  const email = useSession((state) => state.user?.email);
  const name = useDisplayName();
  const selected = Math.max(
    0,
    items.findIndex((item) => item.selected),
  );

  const target = useSharedValue(selected * STEP);
  useEffect(() => {
    target.value = selected * STEP;
  }, [selected, target]);
  const drop = useDrop({ target, length: ITEM, axis: 'y' });

  // O realce do mouse e do teclado é outra gota, que aparece e some.
  const [pointed, setPointed] = useState<number | null>(null);
  const hoverTarget = useSharedValue(selected * STEP);
  const hoverOpacity = useSharedValue(0);
  useEffect(() => {
    if (pointed !== null) hoverTarget.value = pointed * STEP;
    hoverOpacity.value = withTiming(pointed === null || pointed === selected ? 0 : 1, {
      duration: 150,
    });
  }, [pointed, selected, hoverTarget, hoverOpacity]);
  const hover = useDrop({ target: hoverTarget, length: ITEM, axis: 'y' });
  const hoverFade = useAnimatedStyle(() => ({ opacity: hoverOpacity.value }));

  const refs = useRef<unknown[]>([]);
  const keys = useArrowKeys(refs, pointed ?? selected);

  return (
    <View style={styles.aside}>
      {/* Luz atrás do vidro: sem nada por trás, o desfoque não aparece. */}
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />
      <Glass style={styles.panel}>
        <View style={styles.logo}>
          <Logo size={26} />
        </View>
        <View style={styles.balance}>
          <Text style={styles.balanceCaption}>Saldo</Text>
          {balance === undefined ? (
            <Text style={styles.balanceValue}>—</Text>
          ) : (
            <CountingMoney cents={balance} style={styles.balanceValue} />
          )}
        </View>
        <View
          accessibilityRole="tablist"
          accessibilityLabel="Navegação principal"
          style={styles.nav}
          {...keys}
        >
          <Animated.View style={[styles.drop, styles.hover, hover, hoverFade]} />
          <Animated.View style={[styles.drop, styles.selected, drop]} />
          {items.map((item, index) => {
            const color = item.selected ? colors.white : colors.ink;
            return (
              <Pressable
                key={item.route}
                ref={(node) => {
                  refs.current[index] = node;
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: item.selected }}
                aria-selected={item.selected}
                onPress={item.onPress}
                onHoverIn={() => setPointed(index)}
                onHoverOut={() => setPointed(null)}
                onFocus={() => setPointed(index)}
                onBlur={() => setPointed(null)}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
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
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  aside: {
    width: 280,
    height: '100%',
    padding: spacing.md,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    ...Platform.select({
      web: { filter: 'blur(56px)', opacity: 0.75 },
      default: { opacity: 0.2 },
    }),
  },
  glowTop: { top: -40, left: -50, backgroundColor: colors.accent },
  glowBottom: { bottom: 40, right: -90, backgroundColor: colors.leisure },
  panel: {
    flex: 1,
    borderRadius: radii.xxl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
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
  nav: { gap: STEP - ITEM },
  drop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderRadius: radii.lg,
    pointerEvents: 'none',
  },
  selected: { backgroundColor: colors.ink },
  hover: { backgroundColor: 'rgba(17,17,17,0.08)' },
  item: {
    height: ITEM,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  pressed: { opacity: 0.7 },
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
  email: { fontFamily: fonts.body, fontSize: fontSizes.caption, color: colors.slate },
});
