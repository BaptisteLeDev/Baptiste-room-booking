import { DomainError } from '../../common/domain-error.js';
import type { User } from '../../contract.js';
import type { UserEntity } from './infra/user.entity.js';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const emailUsed = () =>
  new DomainError(
    'conflict',
    'EMAIL_ALREADY_USED',
    'Cette adresse e-mail est déjà utilisée.',
  );

export function toUser(e: UserEntity): User {
  return {
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    role: e.role as User['role'],
    createdAt: e.createdAt.toISOString(),
  };
}
