// Shorter HS256 keys can be brute-forced offline from a captured token.
export const assertJwtSecret = (secret: string | undefined): string => {
  if (!secret) throw new Error('JWT_SECRET is required');
  if (secret.length < 32)
    throw new Error('JWT_SECRET must be at least 32 characters');
  return secret;
};
