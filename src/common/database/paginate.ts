import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

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
