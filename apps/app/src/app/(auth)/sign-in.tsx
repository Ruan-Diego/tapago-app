import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInValues } from '@tapago/core';
import { authRepository } from '@tapago/data';
import { Button } from '@tapago/ui';
import { useForm } from 'react-hook-form';

import { AuthScreen } from '@/auth/AuthScreen';
import { FormField } from '@/auth/FormField';
import { TextLink } from '@/auth/TextLink';
import { useAuthAction } from '@/auth/useAuthAction';

export default function SignIn() {
  const { control, handleSubmit } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  const { pending, error, run } = useAuthAction();

  const submit = handleSubmit(({ email, password }) =>
    run('email', () => authRepository.signIn(email, password)),
  );

  return (
    <AuthScreen
      title="Entrar"
      subtitle="Faça o que é bom, evite o que é ruim, compre o seu lazer."
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
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={() => void submit()}
      />
      <Button
        label="Entrar"
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
      <TextLink href="/forgot-password" label="Esqueci a senha" />
      <TextLink href="/sign-up" label="Criar conta" />
    </AuthScreen>
  );
}
