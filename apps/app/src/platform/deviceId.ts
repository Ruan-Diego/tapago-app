import { File, Paths } from 'expo-file-system';

let cached: string | null = null;

/** Identifica este aparelho nos lançamentos. Gerado uma vez e guardado no armazenamento do app. */
export function deviceId(): string {
  if (cached) return cached;
  const fresh = `android-${Math.random().toString(36).slice(2, 12)}`;
  try {
    const file = new File(Paths.document, 'device-id');
    const saved = file.exists ? file.textSync().trim() : '';
    if (!saved) {
      file.create({ overwrite: true });
      file.write(fresh);
    }
    cached = saved || fresh;
  } catch (error) {
    console.warn('Não foi possível guardar o id do aparelho.', error);
    cached = fresh;
  }
  return cached;
}
