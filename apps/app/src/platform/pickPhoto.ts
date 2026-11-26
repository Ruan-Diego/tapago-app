import { LIMITS, centerSquare } from '@tapago/core';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Da melhor qualidade para a menor, até a foto caber no limite. */
const QUALITIES = [0.85, 0.65, 0.45];

/**
 * Escolhe uma foto, recorta o quadrado (a tela mostra em círculo) e reduz para ~256 px em JPEG
 * (PROF-01). Devolve o base64, ou `null` se o usuário desistir. Na web, chamar a partir de um
 * toque.
 */
export async function pickPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // No Android o usuário ajusta o recorte; na web vale o quadrado central.
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;

  const image = await ImageManipulator.manipulate(asset.uri)
    .crop(centerSquare(asset.width, asset.height))
    .resize({ width: LIMITS.avatarSize, height: LIMITS.avatarSize })
    .renderAsync();
  for (const compress of QUALITIES) {
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    const data = saved.base64?.replace(/^data:[^,]*,/, '');
    if (data && data.length <= LIMITS.avatarMaxChars) return data;
  }
  throw new Error('A foto não pôde ser reduzida.');
}
