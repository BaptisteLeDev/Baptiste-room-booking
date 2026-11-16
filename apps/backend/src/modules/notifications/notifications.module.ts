import { Module } from '@nestjs/common';
import { NOTIFICATION_SERVICE } from './domain/ports/notification-service.port.js';
import { LogNotificationService } from './infra/log-notification-service.js';

@Module({
  providers: [
    { provide: NOTIFICATION_SERVICE, useClass: LogNotificationService },
  ],
  exports: [NOTIFICATION_SERVICE],
})
export class NotificationsModule {}
