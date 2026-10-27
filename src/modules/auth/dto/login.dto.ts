import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import type { LoginRequest } from '../../../contract.js';

export class LoginDto implements LoginRequest {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
