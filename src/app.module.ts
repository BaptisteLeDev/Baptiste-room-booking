import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'node:path';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { GqlThrottlerGuard } from './common/http/gql-throttler.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { dataSourceOptions } from './database/data-source.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { RoomsModule } from './modules/rooms/rooms.module.js';
import { ReservationsModule } from './modules/reservations/reservations.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AdminModule } from './modules/admin/admin.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

// opt-in: a deploy without NODE_ENV must not expose the schema
const sandbox = process.env.GRAPHQL_SANDBOX === 'true';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'nest-app',
    }),
    TypeOrmModule.forRootAsync({ useFactory: () => dataSourceOptions }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      playground: false,
      // field resolvers skip guards, but errors still need REST codes
      fieldResolverEnhancers: ['filters'],
      introspection: sandbox,
      includeStacktraceInErrorResponses: false,
      plugins: sandbox ? [ApolloServerPluginLandingPageLocalDefault()] : [],
    }),
    AuthModule,
    RoomsModule,
    ReservationsModule,
    UsersModule,
    PaymentsModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: GqlThrottlerGuard }],
})
export class AppModule {}
