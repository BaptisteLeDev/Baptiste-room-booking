import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export function IsGreaterOrEqualTo(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name: 'isGreaterOrEqualTo',
      target: object.constructor,
      propertyName: String(propertyName),
      constraints: [property],
      options: validationOptions,
      validator: {
        validate: (value: unknown, args: ValidationArguments) => {
          const other = (args.object as Record<string, unknown>)[property];
          return (
            typeof value !== 'number' ||
            typeof other !== 'number' ||
            value >= other
          );
        },
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be greater than or equal to ${property}`,
      },
    });
  };
}
