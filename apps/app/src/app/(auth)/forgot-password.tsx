import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordValues } from '@tapago/core';
import { authRepository } from '@tapago/data';
import { Button, Card, colors, fonts, fontSizes } from '@tapago/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';

import { AuthScreen } from '@/auth/AuthScreen';
import { FormField } from '@/auth/FormField';
import { TextLink } from '@/auth/TextLink';
import { useAuthAction } from '@/auth/useAuthAction';

export default function ForgotPassword() {
  const { control, handleSubmit } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  });
  const { pending, error, run } = useAuthAction();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = handleSubmit(async ({ email }) => {
    setSentTo(null);
    if (await run('email', () => authRepository.sendPasswordReset(email))) setSentTo(email);
  });

  return (
    <AuthScreen
      title="Esqueci a senha"
      subtitle="Enviamos um link para você criar uma senha nova."
      error={error}
    >
      <FormField
        control={control}
        name="email"
        label="E-mail"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onSubmitEditing={() => void submit()}
      />
      <Button label="Enviar link" onPress={() => void submit()} loading={pending === 'email'} />
      {sentTo ? (
        <Card accessibilityLiveRegion="polite">
          <Text style={styles.sent}>
            Se existir uma conta com {sentTo}, o e-mail chega em instantes. Confira também o spam.
          </Text>
        </Card>
      ) : null}
      <TextLink href="/sign-in" label="Voltar para entrar" />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  sent: { fontFamily: fonts.body, fontSize: fontSizes.label, lineHeight: 20, color: colors.ink },
});
