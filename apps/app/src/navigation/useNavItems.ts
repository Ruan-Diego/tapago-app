import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { SECTIONS } from './sections';

/** Itens do menu, com a mesma navegação da barra de abas padrão. */
export function useNavItems({ state, emitter, navigateToTab }: BottomTabBarProps) {
  return state.routes.flatMap((route, index) => {
    const section = SECTIONS.find((candidate) => candidate.route === route.name);
    if (!section) return [];
    const selected = state.index === index;

    return [
      {
        ...section,
        selected,
        onPress() {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!selected && !event.defaultPrevented) navigateToTab(route.key);
        },
      },
    ];
  });
}
