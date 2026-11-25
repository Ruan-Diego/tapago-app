import { SIDEBAR_BREAKPOINT, colors } from '@tapago/ui';
import { Tabs } from 'expo-router/js-tabs';
import { useWindowDimensions } from 'react-native';

import { Sidebar } from '@/navigation/Sidebar';
import { TabBar } from '@/navigation/TabBar';
import { SECTIONS } from '@/navigation/sections';

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= SIDEBAR_BREAKPOINT;

  return (
    <Tabs
      tabBar={(props) => (wide ? <Sidebar {...props} /> : <TabBar {...props} />)}
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'left' : 'bottom',
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      {SECTIONS.map((section) => (
        <Tabs.Screen key={section.route} name={section.route} options={{ title: section.label }} />
      ))}
    </Tabs>
  );
}
