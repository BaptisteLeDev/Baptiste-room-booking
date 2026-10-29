import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

// OFFSET must fit int4 (2^31 - 1) at the max pageSize of 100.
export const MAX_PAGE = Math.floor((2 ** 31 - 1) / 100);

export const paginate = async <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  page: number,
  pageSize: number,
): Promise<{ items: T[]; total: number }> => {
  const [items, total] = await qb
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getManyAndCount();
  return { items, total };
};
