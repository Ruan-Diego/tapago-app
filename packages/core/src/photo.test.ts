import { describe, expect, it } from 'vitest';

import { centerSquare } from './photo';

describe('centerSquare', () => {
  it('recorta o meio da imagem deitada ou em pé', () => {
    expect(centerSquare(400, 300)).toEqual({ originX: 50, originY: 0, width: 300, height: 300 });
    expect(centerSquare(301, 500)).toEqual({ originX: 0, originY: 99, width: 301, height: 301 });
  });
});
