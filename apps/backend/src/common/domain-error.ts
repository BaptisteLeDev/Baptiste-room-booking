export type DomainErrorKind = 'invalid' | 'not_found' | 'conflict';

export class DomainError extends Error {
  constructor(
    readonly kind: DomainErrorKind,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
