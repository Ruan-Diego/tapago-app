import { BlurTargetView } from 'expo-blur';
import type { ComponentProps, Ref } from 'react';
import type { View, ViewProps } from 'react-native';

export interface BlurTargetProps extends ViewProps {
  ref?: Ref<View>;
}

/** Marca o que o vidro pode desfocar no Android. O vidro não pode estar dentro dele. */
export function BlurTarget(props: BlurTargetProps) {
  // Os tipos do expo-blur para a ref não batem com os do React Native desta versão.
  return <BlurTargetView {...(props as ComponentProps<typeof BlurTargetView>)} />;
}
