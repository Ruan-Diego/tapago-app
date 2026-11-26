/** Web: baixa o arquivo pelo navegador. */
export async function exportTextFile(name: string, text: string, mimeType: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Dá tempo ao navegador de começar o download antes de liberar o arquivo.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
