import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

// Numbers or zero-padded "HH:MI" strings: both order correctly with < and >.
function compareTo(
  name: string,
  op: '>=' | '>',
  property: string,
  ok: (cmp: number) => boolean,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name,
      target: object.constructor,
      propertyName: String(propertyName),
      constraints: [property],
      options: validationOptions,
      validator: {
        validate: (value: unknown, args: ValidationArguments) => {
          const other = (args.object as Record<string, unknown>)[property];
          if (typeof value !== typeof other) return true;
          if (typeof value !== 'number' && typeof value !== 'string')
            return true;
          const a = value as number;
          const b = other as number;
          return ok(a < b ? -1 : a > b ? 1 : 0);
        },
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be ${op} ${property}`,
      },
    });
  };
}

export function IsGreaterOrEqualTo(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return compareTo(
    'isGreaterOrEqualTo',
    '>=',
    property,
    (cmp) => cmp >= 0,
    validationOptions,
  );
}

export function IsStrictlyGreaterThan(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return compareTo(
    'isStrictlyGreaterThan',
    '>',
    property,
    (cmp) => cmp > 0,
    validationOptions,
  );
}
