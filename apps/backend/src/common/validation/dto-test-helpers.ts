import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';

export const check = <T extends object>(
  cls: ClassConstructor<T>,
  plain: object,
): Promise<ValidationError[]> => validate(plainToInstance(cls, plain));

export const props = (errors: ValidationError[], prefix = ''): string[] =>
  errors.flatMap((e) => {
    const path = prefix ? `${prefix}.${e.property}` : e.property;
    return [path, ...props(e.children ?? [], path)];
  });

export const LONG_EMAIL = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`;
