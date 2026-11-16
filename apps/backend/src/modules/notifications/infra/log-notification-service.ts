import { Logger } from '@nestjs/common';
import type { INotificationService } from '../domain/ports/notification-service.port.js';

/**
 * No notification provider is configured. Messages go to the log only.
 */
export class LogNotificationService implements INotificationService {
  private readonly logger = new Logger(LogNotificationService.name);

  async sendNotification(userId: string, message: string): Promise<void> {
    this.logger.log(`notification for user ${userId}: ${message}`);
  }
}
