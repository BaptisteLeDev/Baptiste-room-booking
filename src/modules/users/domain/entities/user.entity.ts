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

export type UserState = UserSnapshot & {
  passwordHash: string;
  passwordChangedAt?: string;
  tokenVersion: number;
};

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
      tokenVersion: 0,
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

  get tokenVersion(): number {
    return this.state.tokenVersion;
  }

  get passwordChangedAt(): Date | undefined {
    return this.state.passwordChangedAt
      ? new Date(this.state.passwordChangedAt)
      : undefined;
  }

  changePasswordHash(passwordHash: string, at: Date): void {
    const truncated = new Date(Math.floor(at.getTime() / 1000) * 1000);
    this.state = {
      ...this.state,
      passwordHash,
      passwordChangedAt: truncated.toISOString(),
      tokenVersion: this.state.tokenVersion + 1,
    };
  }

  toSnapshot(): UserSnapshot {
    const {
      passwordHash: _hash,
      passwordChangedAt: _at,
      tokenVersion: _version,
      ...snapshot
    } = this.state;
    return snapshot;
  }

  toState(): UserState {
    return { ...this.state };
  }
}
