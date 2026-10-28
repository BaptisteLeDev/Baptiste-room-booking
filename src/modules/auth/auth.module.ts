import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { UsersPersistenceModule } from '../users/users-persistence.module.js';
import { AuthorizationService } from './application/authorization.service.js';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { MeUseCase } from './application/use-cases/me.use-case.js';
import { RegisterUseCase } from './application/use-cases/register.use-case.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { PASSWORD_HASHER } from './domain/password-hasher.js';
import { REVOKED_TOKEN_STORE } from './domain/revoked-token-store.js';
import { TOKEN_ISSUER } from './domain/token-issuer.js';
import { InMemoryRevokedTokenStore } from './infra/in-memory-revoked-tokens.store.js';
import { JwtTokenIssuer } from './infra/jwt.token-issuer.js';
import { ScryptPasswordHasher } from './infra/scrypt-password-hasher.js';

@Module({
  imports: [
    UsersPersistenceModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is required');
        return { secret };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    LogoutUseCase,
    MeUseCase,
    ChangePasswordUseCase,
    AuthorizationService,
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
    { provide: REVOKED_TOKEN_STORE, useClass: InMemoryRevokedTokenStore },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthorizationService],
})
export class AuthModule {}
