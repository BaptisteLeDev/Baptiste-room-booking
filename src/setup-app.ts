import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import {
  ApiExceptionFilter,
  MESSAGES,
  VALIDATION_ERROR_CODE,
} from './common/http/api-exception.filter.js';
import { validationDetails } from './common/validation/validation-details.js';

export function setupApp(app: INestApplication): void {
  const proxy = process.env.TRUST_PROXY;
  if (proxy) {
    (app as NestExpressApplication).set(
      'trust proxy',
      /^\d+$/.test(proxy) ? Number(proxy) : proxy,
    );
  }
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: VALIDATION_ERROR_CODE,
          message: MESSAGES[400],
          details: { fields: validationDetails(errors) },
        }),
    }),
  );
}
