import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import type { ChangePasswordRequest } from '../../../contract.js';

export class ChangePasswordDto implements ChangePasswordRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
