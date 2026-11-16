import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { LogoutUseCase } from './application/use-cases/logout.use-case.js';
import { MeUseCase } from './application/use-cases/me.use-case.js';
import { RegisterUseCase } from './application/use-cases/register.use-case.js';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        RegisterUseCase,
        LoginUseCase,
        LogoutUseCase,
        MeUseCase,
        ChangePasswordUseCase,
      ].map((provide) => ({ provide, useValue: {} })),
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
