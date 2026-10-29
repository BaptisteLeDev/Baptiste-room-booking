import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type { LoginRequest } from '../../../contract.js';

export class LoginDto implements LoginRequest {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
