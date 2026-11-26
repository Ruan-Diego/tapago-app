import { SIDEBAR_BREAKPOINT, colors } from '@tapago/ui';
import { Tabs } from 'expo-router/js-tabs';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ToastHost } from '@/ledger/ToastHost';
import { Sidebar } from '@/navigation/Sidebar';
import { TabBar } from '@/navigation/TabBar';
import { SECTIONS } from '@/navigation/sections';
import { useSession } from '@/session/store';
import { AlertBanner } from '@/timer/AlertBanner';
import { useTimerController } from '@/timer/useTimerController';

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= SIDEBAR_BREAKPOINT;
  // Até o perfil chegar não dá para saber se falta o onboarding: as abas ficam cobertas.
  const loading = useSession((state) => state.profile === null && !state.profileError);
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
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator accessibilityLabel="Carregando a sua conta" color={colors.ink} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
});
