/** O quadrado central de uma imagem, para recortar a foto de perfil (PROF-01). */
export function centerSquare(width: number, height: number) {
  const side = Math.floor(Math.min(width, height));
  return {
    originX: Math.floor((width - side) / 2),
    originY: Math.floor((height - side) / 2),
    width: side,
    height: side,
  };
}
