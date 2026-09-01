import { describe, expect, it } from 'vitest';
import { buildMeta } from '../src/lib/http';

describe('pagination meta', () => {
  it('reports page bounds for a full result set', () => {
    expect(buildMeta(2, 10, 95)).toMatchObject({
      page: 2,
      totalPages: 10,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('always reports at least one page, even when empty', () => {
    expect(buildMeta(1, 10, 0)).toMatchObject({ totalPages: 1, hasNext: false, hasPrev: false });
  });

  it('closes the door on the last page', () => {
    expect(buildMeta(10, 10, 95).hasNext).toBe(false);
  });
});
