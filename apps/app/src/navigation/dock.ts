import type { RefObject } from 'react';
import type { View } from 'react-native';
import { create } from 'zustand';

/**
 * Altura da barra flutuante do celular (com o mini timer), para o fim das telas e os avisos não
 * ficarem escondidos atrás dela. Zero quando não há barra.
 * `target` é o conteúdo da tela da frente, que o vidro da barra desfoca no Android.
 */
export const useDock = create<{ height: number; target?: RefObject<View | null> }>(() => ({
  height: 0,
}));
