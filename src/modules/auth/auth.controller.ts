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
import { CurrentToken, CurrentUserId } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthService } from './auth.service.js';

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
  login(@Body() body: LoginDto): Promise<AuthResponse> {
    return this.auth.login(body);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentToken() token: string): Promise<void> {
    return this.auth.logout(token);
  }

  @Get('me')
  getCurrentUser(@CurrentUserId() userId: string): Promise<User> {
    return this.auth.me(userId);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUserId() userId: string,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    return this.auth.changePassword(userId, body);
  }
}
