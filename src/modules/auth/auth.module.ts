import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/infra/user.entity.js';
import { AuthorizationService } from './authorization.service.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { RevokedTokens } from './revoked-tokens.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is required');
        return { secret, signOptions: { expiresIn: 3600 } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthorizationService,
    RevokedTokens,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [RevokedTokens, AuthorizationService],
})
export class AuthModule {}
