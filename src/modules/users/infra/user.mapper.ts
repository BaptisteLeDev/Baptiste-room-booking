import {
  type Role,
  User,
  type UserState,
} from '../domain/entities/user.entity.js';
import { UserEntity } from './user.entity.js';

export function toDomain(e: UserEntity): User {
  return User.restore({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    passwordHash: e.passwordHash,
    role: e.role as Role,
    createdAt: e.createdAt.toISOString(),
    passwordChangedAt: e.passwordChangedAt?.toISOString(),
  });
}

export function toEntity(s: UserState): UserEntity {
  return Object.assign(new UserEntity(), {
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email,
    passwordHash: s.passwordHash,
    role: s.role,
    createdAt: new Date(s.createdAt),
    passwordChangedAt: s.passwordChangedAt
      ? new Date(s.passwordChangedAt)
      : null,
  });
}
