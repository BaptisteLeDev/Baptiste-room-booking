import { describe, expect, it } from 'vitest';
import { escapeLike } from './escape-like.js';

describe('escapeLike', () => {
  it.each([
    ['Paris', 'Paris'],
    ['%', '\\%'],
    ['_', '\\_'],
    ['\\', '\\\\'],
    ['50% off_\\', '50\\% off\\_\\\\'],
  ])('escapes %j to %j', (input, expected) => {
    expect(escapeLike(input)).toBe(expected);
  });
});
