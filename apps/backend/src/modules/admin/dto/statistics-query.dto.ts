import { IsDateOnly } from '../../../common/validation/is-date-only.decorator.js';
import { ValidateIfDefined } from '../../../common/validation/validate-if-defined.js';

export class StatisticsQueryDto {
  @ValidateIfDefined()
  @IsDateOnly()
  from?: string;

  @ValidateIfDefined()
  @IsDateOnly()
  to?: string;
}
