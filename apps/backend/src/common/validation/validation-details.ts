import type { ValidationError } from 'class-validator';

export const validationDetails = (
  errors: ValidationError[],
  prefix = '',
  out: Record<string, string[]> = {},
): Record<string, string[]> => {
  for (const e of errors) {
    const path = prefix ? `${prefix}.${e.property}` : e.property;
    if (e.constraints) out[path] = Object.values(e.constraints);
    validationDetails(e.children ?? [], path, out);
  }
  return out;
};
