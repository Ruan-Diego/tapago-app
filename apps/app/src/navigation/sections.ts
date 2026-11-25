import type { IconName } from '@tapago/ui';

export interface Section {
  /** Nome do arquivo em `app/(app)/`. */
  route: string;
  label: string;
  icon: IconName;
}

export const SECTIONS: readonly Section[] = [
  { route: 'index', label: 'Atividades', icon: 'activities' },
  { route: 'shop', label: 'Loja', icon: 'shop' },
  { route: 'inventory', label: 'Inventário', icon: 'inventory' },
  { route: 'history', label: 'Histórico', icon: 'history' },
  { route: 'profile', label: 'Perfil', icon: 'profile' },
];
