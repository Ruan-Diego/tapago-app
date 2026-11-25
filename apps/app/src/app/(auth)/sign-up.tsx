import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, type SignUpValues } from '@tapago/core';
import { authRepository } from '@tapago/data';
import { Button } from '@tapago/ui';
import { useForm } from 'react-hook-form';

import { AuthScreen } from '@/auth/AuthScreen';
import { FormField } from '@/auth/FormField';
import { TextLink } from '@/auth/TextLink';
import { useAuthAction } from '@/auth/useAuthAction';

export default function SignUp() {
  const { control, handleSubmit } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '' },
  });
  const { pending, error, run } = useAuthAction();

  const submit = handleSubmit(({ email, password }) =>
    run('email', () => authRepository.signUp(email, password)),
  );

  return (
    <AuthScreen
      title="Criar conta"
      subtitle="Cada conta tem as próprias atividades, loja e saldo."
      error={error}
    >
      <FormField
        control={control}
        name="email"
        label="E-mail"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <FormField
        control={control}
        name="password"
        label="Senha"
        placeholder="Pelo menos 6 caracteres"
        secureTextEntry
        autoComplete="new-password"
        onSubmitEditing={() => void submit()}
      />
      <Button
        label="Criar conta"
        onPress={() => void submit()}
        loading={pending === 'email'}
        disabled={pending !== null}
      />
      <Button
        label="Continuar com Google"
        variant="secondary"
        onPress={() => void run('google', authRepository.signInWithGoogle)}
        loading={pending === 'google'}
        disabled={pending !== null}
      />
      <TextLink href="/sign-in" label="Já tenho conta" />
    </AuthScreen>
  );
}
