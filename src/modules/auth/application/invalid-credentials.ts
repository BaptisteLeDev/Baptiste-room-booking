import { UnauthorizedException } from '@nestjs/common';

export const invalidCredentials = () =>
  new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: 'Identifiants invalides.',
  });
