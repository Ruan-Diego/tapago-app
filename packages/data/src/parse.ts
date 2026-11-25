import { z } from 'zod';

import type { DocRecord } from './documents';

/** Documentos fora do formato são ignorados (e avisados), sem derrubar a lista inteira. */
export function parseDocs<Output extends object>(
  schema: z.ZodType<Output>,
  docs: readonly DocRecord[],
): (Output & { id: string })[] {
  return docs.flatMap(({ id, data }) => {
    const parsed = schema.safeParse(data);
    if (parsed.success) return [{ ...parsed.data, id }];
    console.warn(`Documento ${id} fora do formato.`, parsed.error);
    return [];
  });
}
