export interface INotificationService {
  sendNotification(userId: string, message: string): Promise<void>;
}

export const NOTIFICATION_SERVICE = 'INotificationService';
