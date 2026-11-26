import { describe, expect, it } from 'vitest';

import { moveInOrder } from './order';

const list = [
  { id: 'a', order: 10 },
  { id: 'b', order: 20 },
  { id: 'c', order: 30 },
];

describe('reordenar atividades (ACT-06)', () => {
  it('sobe trocando de lugar com o vizinho e grava só os dois', () => {
    expect(moveInOrder(list, 'b', -1)).toEqual([
      { id: 'b', order: 10 },
      { id: 'a', order: 20 },
    ]);
  });

  it('desce trocando de lugar com o vizinho', () => {
    expect(moveInOrder(list, 'b', 1)).toEqual([
      { id: 'c', order: 20 },
      { id: 'b', order: 30 },
    ]);
  });

  it('não move além das pontas nem um id que não está na lista', () => {
    expect(moveInOrder(list, 'a', -1)).toEqual([]);
    expect(moveInOrder(list, 'c', 1)).toEqual([]);
    expect(moveInOrder(list, 'x', 1)).toEqual([]);
  });

  it('com ordens repetidas, dá valores novos e distintos a todos', () => {
    const tied = [
      { id: 'a', order: 5 },
      { id: 'b', order: 5 },
      { id: 'c', order: 7 },
    ];
    const changes = moveInOrder(tied, 'c', -1);
    const result = new Map(tied.map((item) => [item.id, item.order]));
    for (const change of changes) result.set(change.id, change.order);
    const ordered = [...result.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => id);
    expect(ordered).toEqual(['a', 'c', 'b']);
    expect(new Set(result.values()).size).toBe(3);
  });
});
