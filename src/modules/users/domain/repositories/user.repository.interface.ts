import type { Role, User } from '../entities/user.entity.js';

export type UserListFilter = {
  page: number;
  pageSize: number;
  role?: Role;
};

export type UserPage = {
  page: number;
  pageSize: number;
  total: number;
  items: User[];
};

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  save(user: User): Promise<User>;
  savePassword(user: User): Promise<void>;
  delete(id: string): Promise<boolean>;
  findPage(filter: UserListFilter): Promise<UserPage>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
