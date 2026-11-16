import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function IsDateOnly(): PropertyDecorator {
  return applyDecorators(IsISO8601({ strict: true }), Matches(DATE));
}
