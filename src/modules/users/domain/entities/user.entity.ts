import { DomainError } from '../../../../common/domain-error.js';

export type Role = 'CLIENT' | 'GESTIONNAIRE' | 'ADMINISTRATEUR';

export type UserSnapshot = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type NewUser = Omit<UserSnapshot, 'role'> & {
  role?: Role;
  passwordHash: string;
};

export type UserState = UserSnapshot & { passwordHash: string };

export type ProfileChanges = Partial<
  Pick<UserSnapshot, 'firstName' | 'lastName' | 'email'>
>;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const emailUsed = () =>
  new DomainError(
    'conflict',
    'EMAIL_ALREADY_USED',
    'Cette adresse e-mail est déjà utilisée.',
  );

export class User {
  private constructor(private state: UserState) {}

  static create(input: NewUser): User {
    return new User({
      ...input,
      email: normalizeEmail(input.email),
      role: input.role ?? 'CLIENT',
    });
  }

  static restore(state: UserState): User {
    return new User({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get email(): string {
    return this.state.email;
  }

  isAdmin(): boolean {
    return this.state.role === 'ADMINISTRATEUR';
  }

  changeProfile(changes: ProfileChanges): void {
    this.state = {
      ...this.state,
      firstName: changes.firstName ?? this.state.firstName,
      lastName: changes.lastName ?? this.state.lastName,
      email:
        changes.email === undefined
          ? this.state.email
          : normalizeEmail(changes.email),
    };
  }

  changeRole(role: Role): void {
    this.state = { ...this.state, role };
  }

  get passwordHash(): string {
    return this.state.passwordHash;
  }

  changePasswordHash(passwordHash: string): void {
    this.state = { ...this.state, passwordHash };
  }

  toSnapshot(): UserSnapshot {
    const { passwordHash: _hash, ...snapshot } = this.state;
    return snapshot;
  }

  toState(): UserState {
    return { ...this.state };
  }
}
