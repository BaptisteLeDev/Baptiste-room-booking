import type { ValueTransformer } from 'typeorm';

export const decimal: ValueTransformer = {
  to: (v?: number) => v,
  from: (v: string | null) => (v === null ? null : Number(v)),
};
