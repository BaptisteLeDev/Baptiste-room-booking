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
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { authResponseFixture } from './fixtures/auth-response.fixture.js';
import { userFixture } from './fixtures/user.fixture.js';

@Controller('auth')
export class AuthController {
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() _body: RegisterDto): User {
    return userFixture;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() _body: LoginDto): AuthResponse {
    return authResponseFixture;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(): void {}

  @Get('me')
  getCurrentUser(): User {
    return userFixture;
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@Body() _body: ChangePasswordDto): void {}
}
