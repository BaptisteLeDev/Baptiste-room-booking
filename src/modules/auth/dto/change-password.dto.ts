import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { ChangePasswordRequest } from '../../../contract.js';

export class ChangePasswordDto implements ChangePasswordRequest {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
