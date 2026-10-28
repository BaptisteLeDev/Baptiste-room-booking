import { IsEmail, IsIn, IsString, MaxLength } from 'class-validator';
import { enumValues } from '../../../../common/validation/enum-values.js';
import { ValidateIfDefined } from '../../../../common/validation/validate-if-defined.js';
import { MinProperties } from '../../../../common/validation/min-properties.js';
import type { UserRole, UserUpdateRequest } from '../../../../contract.js';

const USER_ROLES = enumValues<UserRole>()([
  'CLIENT',
  'GESTIONNAIRE',
  'ADMINISTRATEUR',
]);

@MinProperties(1)
export class UpdateUserDto implements UserUpdateRequest {
  @ValidateIfDefined()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ValidateIfDefined()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ValidateIfDefined()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ValidateIfDefined()
  @IsIn(USER_ROLES)
  role?: UserRole;
}
