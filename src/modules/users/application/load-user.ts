import { notFound } from '../../../common/not-found.js';
import type { User } from '../domain/entities/user.entity.js';
import type { IUserRepository } from '../domain/repositories/user.repository.interface.js';

export async function loadUser(
  users: IUserRepository,
  id: string,
): Promise<User> {
  const user = await users.findById(id);
  if (!user) throw notFound();
  return user;
}
