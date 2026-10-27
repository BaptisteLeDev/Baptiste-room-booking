import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export function MinProperties(
  min: number,
  validationOptions?: ValidationOptions,
): ClassDecorator {
  return (target) => {
    registerDecorator({
      name: 'minProperties',
      target,
      propertyName: '',
      constraints: [min],
      options: validationOptions,
      validator: {
        validate: (_value: unknown, args: ValidationArguments) =>
          Object.values(args.object as Record<string, unknown>).filter(
            (v) => v !== undefined,
          ).length >= min,
        defaultMessage: () => `must have at least ${min} defined properties`,
      },
    });
  };
}
