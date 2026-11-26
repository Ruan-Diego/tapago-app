import { zodResolver } from '@hookform/resolvers/zod';
import {
  DEFAULT_STREAK_STEP,
  activityFormSchema,
  reaisInput,
  type Activity,
  type ActivityFormInput,
  type ActivityKind,
  type ActivityValues,
} from '@tapago/core';
import { activitiesRepository } from '@tapago/data';
import { Button, Sheet, ToggleRow, colors, fonts, fontSizes, radii, spacing } from '@tapago/ui';
import { useController, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/auth/FormField';
import { save } from '@/ledger/actions';
import { showToast } from '@/ledger/toast';
import { confirm } from '@/platform/confirm';

const KINDS: { value: ActivityKind; title: string; hint: string }[] = [
  { value: 'positive', title: '+ Positiva', hint: 'ganha dinheiro' },
  { value: 'negative', title: '− Negativa', hint: 'perde dinheiro' },
];

interface ActivitySheetProps {
  uid: string;
  /** Ausente ao criar. */
  activity?: Activity;
  onClose: () => void;
}

/** Criar, editar e arquivar atividade (ACT-01, ACT-02). */
export function ActivitySheet({ uid, activity, onClose }: ActivitySheetProps) {
  const { control, handleSubmit } = useForm<ActivityFormInput, unknown, ActivityValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: activity
      ? {
          kind: activity.kind,
          name: activity.name,
          description: activity.description,
          value: reaisInput(activity.value),
          minutes: String(activity.minutes),
          streakStep: reaisInput(activity.streakStep),
          isHabit: Boolean(activity.habit),
          habitTarget: activity.habit ? String(activity.habit.target) : '',
          habitBonus: activity.habit ? reaisInput(activity.habit.bonus) : '',
        }
      : {
          kind: 'positive',
          name: '',
          description: '',
          value: '',
          minutes: '30',
          streakStep: reaisInput(DEFAULT_STREAK_STEP),
          isHabit: false,
          habitTarget: '',
          habitBonus: '',
        },
  });
  const { field: kind } = useController({ control, name: 'kind' });
  const negative = useWatch({ control, name: 'kind' }) === 'negative';
  const { field: isHabit } = useController({ control, name: 'isHabit' });

  const submit = handleSubmit((values) => {
    if (activity) {
      save(activitiesRepository.update(uid, activity.id, values));
      showToast(`${values.name} — atividade salva.`);
    } else {
      save(activitiesRepository.create(uid, values));
      showToast(`${values.name} — atividade criada.`, values.kind === 'negative' ? '−' : '+');
    }
    onClose();
  });

  async function archive(target: Activity) {
    const proceed = await confirm({
      title: `Arquivar "${target.name}"?`,
      message: 'Ela some da lista. O histórico continua como está.',
      confirmLabel: 'Arquivar',
    });
    if (!proceed) return;
    save(activitiesRepository.archive(uid, target.id));
    showToast(`${target.name} — arquivada.`);
    onClose();
  }

  return (
    <Sheet title={activity ? 'Editar atividade' : 'Nova atividade'} onClose={onClose}>
      {activity ? null : (
        <View accessibilityRole="radiogroup" accessibilityLabel="Tipo" style={styles.kinds}>
          {KINDS.map((option) => {
            const selected = kind.value === option.value;
            const color = selected ? colors.onSurfaceInk : colors.ink;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                onPress={() => kind.onChange(option.value)}
                style={[styles.kind, selected && styles.selected]}
              >
                <Text style={[styles.kindTitle, { color }]}>{option.title}</Text>
                <Text style={[styles.kindHint, { color }]}>{option.hint}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <FormField
        control={control}
        name="name"
        label="Nome"
        placeholder={negative ? 'Ex.: Scrollar demais no TikTok' : 'Ex.: Tirar o lixo'}
      />
      <FormField
        control={control}
        name="description"
        label="Descrição (opcional)"
        placeholder={
          negative ? 'Ex.: Mais de 30 minutos seguidos' : 'Ex.: Antes das 22h, saco amarrado'
        }
      />
      <View style={styles.row}>
        <View style={styles.cell}>
          <FormField
            control={control}
            name="value"
            label={negative ? 'Você perde (R$)' : 'Você ganha (R$)'}
            keyboardType="decimal-pad"
            placeholder="10"
          />
        </View>
        <View style={styles.cell}>
          <FormField
            control={control}
            name="minutes"
            label={negative ? 'Tempo perdido (min)' : 'Leva (min)'}
            keyboardType="number-pad"
            placeholder="30"
          />
        </View>
      </View>
      {negative ? (
        <Text style={styles.note}>
          O custo sobe a cada registro: o 2º cobra o dobro do valor, o 3º o triplo, e assim por
          diante. Ele não zera sozinho: você zera no cartão da atividade.
        </Text>
      ) : (
        <>
          <View style={styles.group}>
            <FormField
              control={control}
              name="streakStep"
              label="Aumento por dia de sequência (R$)"
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <Text style={styles.note}>
              Cada dia seguido soma isso ao valor. Um dia sem fazer volta ao início. Use 0 para o
              valor não mudar.
            </Text>
          </View>
          <ToggleRow
            label="É um hábito diário?"
            hint="Paga um bônus ao completar as vezes do dia."
            value={isHabit.value}
            onChange={isHabit.onChange}
          />
          {isHabit.value ? (
            <>
              <FormField
                control={control}
                name="habitTarget"
                label="Quantas vezes por dia?"
                keyboardType="number-pad"
                placeholder="3"
              />
              <FormField
                control={control}
                name="habitBonus"
                label="Bônus ao completar (R$)"
                keyboardType="decimal-pad"
                placeholder="50"
              />
            </>
          ) : null}
        </>
      )}
      <Button
        label={negative ? 'Salvar atividade negativa' : 'Salvar atividade'}
        onPress={() => void submit()}
      />
      {activity ? (
        <Button label="Arquivar" variant="outline" onPress={() => void archive(activity)} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  kinds: { flexDirection: 'row', gap: spacing.sm },
  kind: {
    flex: 1,
    minHeight: 64,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  selected: { backgroundColor: colors.surfaceInk, borderRadius: radii.md },
  kindTitle: { fontFamily: fonts.displayBold, fontSize: 17 },
  kindHint: { fontFamily: fonts.body, fontSize: fontSizes.caption, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, minWidth: 0 },
  group: { gap: 6 },
  note: {
    fontFamily: fonts.body,
    fontSize: fontSizes.caption,
    lineHeight: 18,
    color: colors.graphite,
  },
});
