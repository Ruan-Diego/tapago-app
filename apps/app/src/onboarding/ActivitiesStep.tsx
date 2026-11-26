import { ACTIVITY_VALUE_STEP, formatDuration, stepPreset, type ActivityPreset } from '@tapago/core';
import { colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { StyleSheet, Text, View } from 'react-native';

import { AddPreset } from './AddPreset';
import { PresetRow } from './PresetRow';
import { StepTitle } from './StepTitle';

interface ActivitiesStepProps {
  presets: readonly ActivityPreset[];
  onChange: (preset: ActivityPreset) => void;
  onAdd: (preset: ActivityPreset) => void;
  taken: readonly string[];
}

const GROUPS = [
  { kind: 'positive', title: '+ Ganham dinheiro', hint: null, sign: '+', detail: '≈ ' },
  {
    kind: 'negative',
    title: '− Custam dinheiro',
    hint: 'Hábitos que você quer largar. Toda vez que acontecer, você registra e perde.',
    sign: '−',
    detail: 'tempo perdido ≈ ',
  },
] as const;

/** Presets de atividades + e − (ONB-03). */
export function ActivitiesStep({ presets, onChange, onAdd, taken }: ActivitiesStepProps) {
  return (
    <>
      <StepTitle title={'Suas\natividades'}>
        As boas dão dinheiro. As ruins tiram. Marque as suas e ajuste os valores — dá pra mudar
        depois.
      </StepTitle>
      <View style={styles.list}>
        {GROUPS.map((group) => (
          <View key={group.kind} style={styles.list}>
            <Text accessibilityRole="header" style={styles.group}>
              {group.title}
            </Text>
            {group.hint ? <Text style={styles.hint}>{group.hint}</Text> : null}
            {presets
              .filter((preset) => preset.kind === group.kind)
              .map((preset) => (
                <PresetRow
                  key={preset.name}
                  name={preset.name}
                  detail={group.detail + formatDuration(preset.minutes)}
                  value={preset.value}
                  sign={group.sign}
                  selected={preset.selected}
                  onToggle={() => onChange({ ...preset, selected: !preset.selected })}
                  onStep={(direction) =>
                    onChange(stepPreset(preset, direction * ACTIVITY_VALUE_STEP))
                  }
                />
              ))}
          </View>
        ))}
        <AddPreset
          withKind
          taken={taken}
          onAdd={(preset) => onAdd({ ...preset, selected: true })}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  group: {
    marginTop: spacing.xs,
    fontFamily: fonts.bodyBold,
    fontSize: fontSizes.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.small, color: colors.graphite },
});
