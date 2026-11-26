import { describe, expect, it } from 'vitest';

import { activityFormSchema, reaisInput, shopItemFormSchema } from './forms';
import { LIMITS } from './limits';
import {
  ACTIVITY_PRESETS,
  PRESET_VALUE_MIN,
  SHOP_PRESETS,
  cheapest,
  hasPositiveSelected,
  isAlreadyConfigured,
  stepPreset,
  withoutExisting,
} from './onboarding';

describe('sugestões do onboarding', () => {
  it('passam pela mesma validação dos formulários', () => {
    for (const preset of ACTIVITY_PRESETS) {
      const parsed = activityFormSchema.safeParse({
        ...preset,
        description: '',
        value: reaisInput(preset.value),
        minutes: String(preset.minutes),
      });
      expect(parsed.success).toBe(true);
    }
    for (const preset of SHOP_PRESETS) {
      const parsed = shopItemFormSchema.safeParse({
        ...preset,
        value: reaisInput(preset.value),
        minutes: String(preset.minutes),
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('já começam com uma positiva e um lazer marcados', () => {
    expect(hasPositiveSelected(ACTIVITY_PRESETS)).toBe(true);
    expect(SHOP_PRESETS.some((preset) => preset.selected)).toBe(true);
  });

  it('exigem uma positiva marcada: só negativas não bastam', () => {
    const onlyNegatives = ACTIVITY_PRESETS.map((preset) => ({
      ...preset,
      selected: preset.kind === 'negative',
    }));
    expect(hasPositiveSelected(onlyNegatives)).toBe(false);
  });

  it('o −/+ respeita a faixa e marca o item', () => {
    const preset = { name: 'x', value: 200, selected: false };
    expect(stepPreset(preset, 100)).toEqual({ name: 'x', value: 300, selected: true });
    expect(stepPreset(preset, -1000).value).toBe(PRESET_VALUE_MIN);
    expect(stepPreset(preset, LIMITS.valueMax).value).toBe(LIMITS.valueMax);
  });

  it('não repetem o que a conta já tem, mas voltam com o que foi arquivado', () => {
    const left = withoutExisting(SHOP_PRESETS, [
      { name: ' jogar 1 HORA ', archived: false },
      { name: 'Redes sociais', archived: true },
    ]);
    expect(left.map((preset) => preset.name)).not.toContain('Jogar 1 hora');
    expect(left.map((preset) => preset.name)).toContain('Redes sociais');
  });

  it('dispensam a conta que já tem atividade positiva e loja', () => {
    const positive = { kind: 'positive' as const, archived: false };
    const item = { archived: false };
    expect(isAlreadyConfigured([positive], [item])).toBe(true);
    expect(isAlreadyConfigured([positive], [])).toBe(false);
    expect(isAlreadyConfigured([{ kind: 'negative', archived: false }], [item])).toBe(false);
    expect(isAlreadyConfigured([{ ...positive, archived: true }], [item])).toBe(false);
  });

  it('apontam o lazer mais barato', () => {
    expect(cheapest([{ value: 300 }, { value: 100 }, { value: 200 }])).toEqual({ value: 100 });
    expect(cheapest([])).toBeNull();
  });
});
