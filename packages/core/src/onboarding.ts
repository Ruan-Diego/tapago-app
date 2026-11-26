/** Sugestões e regras do primeiro uso (ONB-01 a ONB-05). */
import type { ActivityKind } from './ledger';
import { LIMITS } from './limits';

export interface ActivityPreset {
  name: string;
  kind: ActivityKind;
  /** Centavos (R1). */
  value: number;
  minutes: number;
  selected: boolean;
}

export interface ShopPreset {
  name: string;
  value: number;
  minutes: number;
  selected: boolean;
}

/** Quanto os botões −/+ mudam o valor, em centavos. */
export const ACTIVITY_VALUE_STEP = 100;
export const SHOP_VALUE_STEP = 200;
/** O menor valor que os botões −/+ deixam. */
export const PRESET_VALUE_MIN = 100;
/** Duração sugerida para o que o usuário acrescenta no onboarding. */
export const CUSTOM_PRESET_MINUTES = 30;

const activity = (
  name: string,
  reais: number,
  minutes: number,
  selected: boolean,
  kind: ActivityKind = 'positive',
): ActivityPreset => ({ name, kind, value: reais * 100, minutes, selected });

const negative = (name: string, reais: number, minutes: number, selected: boolean) =>
  activity(name, reais, minutes, selected, 'negative');

export const ACTIVITY_PRESETS: readonly ActivityPreset[] = [
  activity('Passear com o cachorro', 5, 30, true),
  activity('Lavar a louça', 10, 20, true),
  activity('Limpar o banheiro', 20, 45, true),
  activity('Arrumar a cama', 3, 5, true),
  activity('Estudar 1 hora', 15, 60, false),
  activity('Treinar', 12, 50, false),
  activity('Tirar o lixo', 4, 5, false),
  activity('Lavar roupa', 12, 30, false),
  negative('Scrollar demais no Reels', 8, 40, true),
  negative('YouTube por tempo demais', 10, 60, true),
  negative('Gritar com alguém', 15, 5, false),
  negative('Perder o controle', 20, 30, false),
  negative('Dormir depois da 1h', 6, 60, false),
];

const shop = (name: string, reais: number, minutes: number, selected: boolean): ShopPreset => ({
  name,
  value: reais * 100,
  minutes,
  selected,
});

export const SHOP_PRESETS: readonly ShopPreset[] = [
  shop('Jogar 30 minutos', 10, 30, true),
  shop('Jogar 1 hora', 18, 60, true),
  shop('Jogar 2 horas', 32, 120, true),
  shop('Assistir um filme', 25, 120, true),
  shop('Episódio de série longo', 12, 60, true),
  shop('Redes sociais', 6, 20, false),
  shop('Sair com os amigos', 40, 180, false),
];

/** Aplica um toque em −/+: o valor fica na faixa aceita e o item passa a estar marcado. */
export function stepPreset<Preset extends { value: number; selected: boolean }>(
  preset: Preset,
  delta: number,
): Preset {
  const value = Math.min(LIMITS.valueMax, Math.max(PRESET_VALUE_MIN, preset.value + delta));
  return { ...preset, value, selected: true };
}

const normalized = (name: string) => name.trim().toLocaleLowerCase('pt-BR');

/** Tira das sugestões o que a conta já tem, para não duplicar. */
export function withoutExisting<Preset extends { name: string }>(
  presets: readonly Preset[],
  existing: readonly { name: string; archived: boolean }[],
): Preset[] {
  const names = new Set(existing.filter((item) => !item.archived).map((i) => normalized(i.name)));
  return presets.filter((preset) => !names.has(normalized(preset.name)));
}

/** Para seguir das atividades é preciso ao menos 1 positiva (ONB-03). */
export function hasPositiveSelected(presets: readonly ActivityPreset[]): boolean {
  return presets.some((preset) => preset.selected && preset.kind === 'positive');
}

/**
 * Conta que já usava o app antes do onboarding existir: com uma atividade positiva e um item na
 * loja, não há o que configurar.
 */
export function isAlreadyConfigured(
  activities: readonly { kind: ActivityKind; archived: boolean }[],
  shopItems: readonly { archived: boolean }[],
): boolean {
  return (
    activities.some((item) => !item.archived && item.kind === 'positive') &&
    shopItems.some((item) => !item.archived)
  );
}

/** O primeiro objetivo da tela final: o lazer mais barato. */
export function cheapest<Item extends { value: number }>(items: readonly Item[]): Item | null {
  return items.reduce<Item | null>(
    (best, item) => (best === null || item.value < best.value ? item : best),
    null,
  );
}
