import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse, User } from '../../contract.js';
import { CurrentToken, CurrentUserId } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { MeUseCase } from './application/use-cases/me.use-case.js';
import { RegisterUseCase } from './application/use-cases/register.use-case.js';

// Per IP and route: brute-force and account-creation floods.
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUseCase,
    private readonly loginUser: LoginUseCase,
    private readonly logoutUser: LogoutUseCase,
    private readonly me: MeUseCase,
    private readonly changeUserPassword: ChangePasswordUseCase,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterDto): Promise<User> {
    return this.registerUser.execute(body);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto): Promise<AuthResponse> {
    return this.loginUser.execute(body);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentToken() token: string): Promise<void> {
    return this.logoutUser.execute(token);
  }

  @Get('me')
  getCurrentUser(@CurrentUserId() userId: string): Promise<User> {
    return this.me.execute(userId);
  }

  @Patch('password')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUserId() userId: string,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    return this.changeUserPassword.execute(userId, body);
  }
}
