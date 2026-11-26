import { LIMITS } from '@tapago/core';
import { Button, TextField, spacing } from '@tapago/ui';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/profile/Avatar';
import { PhotoError, usePhotoPicker } from '@/profile/PhotoButton';

import { StepTitle } from './StepTitle';

interface NameStepProps {
  name: string;
  photo: string | null;
  onName: (name: string) => void;
  onPhoto: (photo: string) => void;
}

/** Nome obrigatório e foto opcional (ONB-02). */
export function NameStep({ name, photo, onName, onPhoto }: NameStepProps) {
  const picker = usePhotoPicker(onPhoto);

  return (
    <>
      <StepTitle title={'Como você\nse chama?'}>É só pra deixar o app com a sua cara.</StepTitle>
      <View style={styles.photo}>
        <Avatar size={128} preview={{ photo, name }} />
        <Button
          label={photo ? 'Trocar foto' : 'Escolher foto'}
          variant="outline"
          loading={picker.busy}
          onPress={() => void picker.pick()}
        />
        <PhotoError visible={picker.failed} />
      </View>
      <TextField
        label="Seu nome"
        value={name}
        onChangeText={onName}
        placeholder="Ex.: Rafael"
        maxLength={LIMITS.nameMax}
        autoComplete="name"
        autoCapitalize="words"
      />
    </>
  );
}

const styles = StyleSheet.create({
  photo: { alignItems: 'center', gap: 14, marginBottom: spacing.xxl },
});
