import type { RefObject } from 'react';
import type { View, ViewProps } from 'react-native';

export interface GlassProps extends ViewProps {
  /** O conteúdo que passa por trás e deve ser desfocado no Android (ver `BlurTarget`). */
  blurTarget?: RefObject<View | null>;
}
