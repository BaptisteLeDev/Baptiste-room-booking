import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { MAX_PAGE } from '../../../common/database/paginate.js';
import { enumValues } from '../../../common/validation/enum-values.js';
import { ValidateIfDefined } from '../../../common/validation/validate-if-defined.js';
import type { UserRole } from '../../../contract.js';

const ROLES = enumValues<UserRole>()([
  'CLIENT',
  'GESTIONNAIRE',
  'ADMINISTRATEUR',
]);

export class ListUsersQueryDto {
  @ValidateIfDefined()
  @IsIn(ROLES)
  role?: UserRole;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
