import type { AuthResponse } from '../../../contract.js';
import { userFixture } from './user.fixture.js';

export const authResponseFixture: AuthResponse = {
  accessToken: 'stub-access-token',
  refreshToken: 'stub-refresh-token',
  expiresIn: 3600,
  user: userFixture,
};
