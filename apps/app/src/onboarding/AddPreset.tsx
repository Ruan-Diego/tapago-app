import { CUSTOM_PRESET_MINUTES, LIMITS, shopItemFormSchema, type ActivityKind } from '@tapago/core';
import { Button, Card, Tabs, TextField, colors, fonts, fontSizes, spacing } from '@tapago/ui';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface CustomPreset {
  kind: ActivityKind;
  name: string;
  value: number;
  minutes: number;
}

interface AddPresetProps {
  /** Na lista de atividades dá para escolher entre ganhar e perder. */
  withKind: boolean;
  /** Nomes que já estão na lista. */
  taken: readonly string[];
  onAdd: (preset: CustomPreset) => void;
}

const KINDS = [
  { value: 'positive', label: '+ Ganha' },
  { value: 'negative', label: '− Perde' },
] as const;

/** Acrescentar algo que não está nas sugestões. */
export function AddPreset({ withKind, taken, onAdd }: AddPresetProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ActivityKind>('positive');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const title = withKind ? 'Nova atividade' : 'Novo lazer';

  if (!open) {
    return (
      <Button
        label={withKind ? '+ Adicionar outra atividade' : '+ Adicionar outro lazer'}
        variant="outline"
        onPress={() => setOpen(true)}
      />
    );
  }

  function add() {
    const parsed = shopItemFormSchema.safeParse({
      name,
      value,
      minutes: String(CUSTOM_PRESET_MINUTES),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Confira os campos.');
      return;
    }
    const wanted = parsed.data.name.toLocaleLowerCase('pt-BR');
    if (taken.some((other) => other.toLocaleLowerCase('pt-BR') === wanted)) {
      setError('Já está na lista.');
      return;
    }
    onAdd({ kind, ...parsed.data });
    setName('');
    setValue('');
    setError(null);
    setOpen(false);
  }

  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {withKind ? <Tabs options={KINDS} value={kind} onChange={setKind} /> : null}
      <TextField
        label="Nome"
        value={name}
        onChangeText={setName}
        placeholder={
          !withKind
            ? 'Ex.: Ler mangá 1 hora'
            : kind === 'negative'
              ? 'Ex.: Roer unha'
              : 'Ex.: Regar as plantas'
        }
        maxLength={LIMITS.nameMax}
      />
      <TextField
        label="Valor em reais"
        value={value}
        onChangeText={setValue}
        placeholder="Ex.: 10"
        keyboardType="decimal-pad"
        onSubmitEditing={add}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="Cancelar"
          variant="secondary"
          style={styles.action}
          onPress={() => setOpen(false)}
        />
        <Button label="Adicionar" style={styles.action} onPress={add} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  title: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.label, color: colors.ink },
  error: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.small, color: colors.danger },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
