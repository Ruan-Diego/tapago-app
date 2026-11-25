import { SIDEBAR_BREAKPOINT, colors } from '@tapago/ui';
import { Tabs } from 'expo-router/js-tabs';
import { View, useWindowDimensions } from 'react-native';

import { ToastHost } from '@/ledger/ToastHost';
import { useLedgerSubscription } from '@/ledger/store';
import { useToday } from '@/ledger/useToday';
import { Sidebar } from '@/navigation/Sidebar';
import { TabBar } from '@/navigation/TabBar';
import { SECTIONS } from '@/navigation/sections';
import { useSession } from '@/session/store';
import { AlertBanner } from '@/timer/AlertBanner';
import { useTimerController } from '@/timer/useTimerController';

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= SIDEBAR_BREAKPOINT;
  const uid = useSession((state) => state.user?.uid);
  useLedgerSubscription(uid, useToday());
  useTimerController();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => (wide ? <Sidebar {...props} /> : <TabBar {...props} />)}
        screenOptions={{
          headerShown: false,
          tabBarPosition: wide ? 'left' : 'bottom',
          sceneStyle: { backgroundColor: colors.paper },
        }}
      >
        {SECTIONS.map((section) => (
          <Tabs.Screen
            key={section.route}
            name={section.route}
            options={{ title: section.label }}
          />
        ))}
      </Tabs>
      <ToastHost />
      <AlertBanner />
    </View>
  );
}
