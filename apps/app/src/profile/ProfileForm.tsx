import { zodResolver } from '@hookform/resolvers/zod';
import {
  LIMITS,
  profileFormSchema,
  reaisInput,
  type ProfileFormInput,
  type ProfileValues,
  type UserProfile,
} from '@tapago/core';
import { profileRepository } from '@tapago/data';
import { Button, Card, spacing } from '@tapago/ui';
import { useForm } from 'react-hook-form';
import { StyleSheet } from 'react-native';

import { FormField } from '@/auth/FormField';
import { save } from '@/ledger/actions';
import { showToast } from '@/ledger/toast';

/** Nome, frase e meta semanal, salvos na conta (PROF-01, PROF-02). */
export function ProfileForm({ uid, profile }: { uid: string; profile: UserProfile }) {
  const { control, handleSubmit, reset, formState } = useForm<
    ProfileFormInput,
    unknown,
    ProfileValues
  >({
    resolver: zodResolver(profileFormSchema),
    // Segue o que outro aparelho mudar, sem apagar o que está sendo digitado.
    values: {
      name: profile.name,
      bio: profile.bio,
      weeklyGoal: profile.weeklyGoal > 0 ? reaisInput(profile.weeklyGoal) : '',
    },
    resetOptions: { keepDirtyValues: true },
  });

  const submit = handleSubmit((values) => {
    save(profileRepository.update(uid, values));
    reset({
      ...values,
      weeklyGoal: values.weeklyGoal > 0 ? reaisInput(values.weeklyGoal) : '',
    });
    showToast('Perfil salvo.');
  });

  return (
    <Card style={styles.card}>
      <FormField control={control} name="name" label="Nome" maxLength={LIMITS.nameMax} />
      <FormField
        control={control}
        name="bio"
        label="Frase"
        placeholder="Ex.: Primeiro o que é bom."
        maxLength={LIMITS.descriptionMax}
      />
      <FormField
        control={control}
        name="weeklyGoal"
        label="Meta semanal de ganhos (R$)"
        placeholder="Sem meta"
        keyboardType="decimal-pad"
      />
      <Button label="Salvar" disabled={!formState.isDirty} onPress={() => void submit()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
});
