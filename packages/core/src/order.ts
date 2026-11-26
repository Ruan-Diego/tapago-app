/**
 * Reordenar atividades (ACT-06). A ordem fica no campo `order` de cada documento, então vale em
 * todos os aparelhos. Mover um item troca de lugar com o vizinho e grava só o que mudou.
 */

export interface Ordered {
  id: string;
  order: number;
}

export interface OrderChange {
  id: string;
  order: number;
}

/**
 * As novas posições depois de mover `id` uma casa para cima (`-1`) ou para baixo (`1`) dentro de
 * `list`, que já está na ordem mostrada. Vazio quando não há para onde mover.
 *
 * Os valores de `order` existentes são reaproveitados na mesma sequência. Se houver repetidos
 * (itens que nasceram no mesmo milissegundo), a lista inteira ganha valores novos e distintos.
 */
export function moveInOrder(
  list: readonly Ordered[],
  id: string,
  direction: -1 | 1,
): OrderChange[] {
  const from = list.findIndex((item) => item.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= list.length) return [];

  const moved = [...list];
  const [item] = moved.splice(from, 1);
  if (!item) return [];
  moved.splice(to, 0, item);

  let slots = list.map((entry) => entry.order).sort((a, b) => a - b);
  if (new Set(slots).size !== slots.length) {
    const start = slots[0] ?? 0;
    slots = slots.map((_, index) => start + index);
  }

  return moved
    .map((entry, index) => ({ id: entry.id, order: slots[index] ?? entry.order }))
    .filter((change, index) => change.order !== moved[index]?.order);
}
