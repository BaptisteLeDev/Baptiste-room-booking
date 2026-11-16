export const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

// Dev-only placeholders must never reach production.
export const envOrDevFallback = (name: string, fallback: string): string => {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production')
    throw new Error(`${name} is required in production`);
  return fallback;
};
