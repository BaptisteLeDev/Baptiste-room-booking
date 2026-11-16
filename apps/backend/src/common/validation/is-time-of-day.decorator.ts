import { Matches } from 'class-validator';

const TIME_OF_DAY = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function IsTimeOfDay(): PropertyDecorator {
  return Matches(TIME_OF_DAY);
}
