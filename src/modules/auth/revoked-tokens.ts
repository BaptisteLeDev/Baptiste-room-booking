import { Injectable } from '@nestjs/common';

@Injectable()
export class RevokedTokens {
  // ponytail: in-memory, lost on restart, single instance only.
  // Upgrade to a DB/redis table when scaling out.
  private readonly expiries = new Map<string, number>();

  revoke(token: string, expSeconds: number): void {
    const now = Date.now() / 1000;
    for (const [revoked, exp] of this.expiries) {
      if (exp <= now) this.expiries.delete(revoked);
    }
    this.expiries.set(token, expSeconds);
  }

  has(token: string): boolean {
    return this.expiries.has(token);
  }
}
