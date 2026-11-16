import type { SelectQueryBuilder } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { paginate } from './paginate.js';

describe('paginate', () => {
  it('applies skip/take from page and returns items and total', async () => {
    const qb = {
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[{ id: 'a' }], 7]),
    };
    const out = await paginate(
      qb as unknown as SelectQueryBuilder<{ id: string }>,
      3,
      10,
    );
    expect(qb.skip).toHaveBeenCalledWith(20);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(out).toEqual({ items: [{ id: 'a' }], total: 7 });
  });
});
