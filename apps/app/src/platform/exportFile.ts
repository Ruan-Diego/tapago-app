/** Android: grava o arquivo no cache do app e abre o compartilhar do sistema (Drive, e-mail…). */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportTextFile(name: string, text: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('O compartilhamento não está disponível neste aparelho.');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Exportar lançamentos' });
}
