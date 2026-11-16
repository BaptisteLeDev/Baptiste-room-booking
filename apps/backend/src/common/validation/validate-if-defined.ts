import { ValidateIf } from 'class-validator';

export function ValidateIfDefined(): PropertyDecorator {
  return ValidateIf((_object, value: unknown) => value !== undefined);
}
