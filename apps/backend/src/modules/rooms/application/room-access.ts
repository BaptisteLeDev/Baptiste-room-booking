import type { AuthorizationService } from '../../auth/application/authorization.service.js';

// A demoted owner keeps the ownerId, so the manager role is re-checked.
export async function assertRoomOwnerOrAdmin(
  authorization: AuthorizationService,
  userId: string,
  ownerId: string,
): Promise<void> {
  if (userId === ownerId) await authorization.assertManager(userId);
  else await authorization.assertAdmin(userId);
}
