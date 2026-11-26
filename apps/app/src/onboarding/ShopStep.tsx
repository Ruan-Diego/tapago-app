import { SHOP_VALUE_STEP, formatDuration, stepPreset, type ShopPreset } from '@tapago/core';
import { spacing } from '@tapago/ui';
import { StyleSheet, View } from 'react-native';

import { AddPreset } from './AddPreset';
import { PresetRow } from './PresetRow';
import { StepTitle } from './StepTitle';

interface ShopStepProps {
  presets: readonly ShopPreset[];
  onChange: (preset: ShopPreset) => void;
  onAdd: (preset: ShopPreset) => void;
  taken: readonly string[];
}

/** Montar a loja com presets (ONB-04). */
export function ShopStep({ presets, onChange, onAdd, taken }: ShopStepProps) {
  return (
    <>
      <StepTitle title={'Sua loja\nde lazer'}>
        Quanto custa cada momento de lazer? Quanto mais caro, mais esforço ele exige.
      </StepTitle>
      <View style={styles.list}>
        {presets.map((preset) => (
          <PresetRow
            key={preset.name}
            name={preset.name}
            detail={`dura ${formatDuration(preset.minutes)}`}
            value={preset.value}
            sign=""
            selected={preset.selected}
            onToggle={() => onChange({ ...preset, selected: !preset.selected })}
            onStep={(direction) => onChange(stepPreset(preset, direction * SHOP_VALUE_STEP))}
          />
        ))}
        <AddPreset
          withKind={false}
          taken={taken}
          onAdd={({ name, value, minutes }) => onAdd({ name, value, minutes, selected: true })}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
});
