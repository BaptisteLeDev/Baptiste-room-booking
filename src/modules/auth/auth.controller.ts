import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import type { AuthResponse, User } from '../../contract.js';
import { Public } from './public.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';
import { authResponseFixture } from './fixtures/auth-response.fixture.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterDto): Promise<User> {
    return this.auth.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() _body: LoginDto): AuthResponse {
    return authResponseFixture;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(): void {}

  @Get('me')
  getCurrentUser(): Promise<User> {
    return this.auth.me();
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@Body() _body: ChangePasswordDto): void {}
}
