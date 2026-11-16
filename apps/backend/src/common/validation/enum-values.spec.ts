import { enumValues } from './enum-values.js';

type Letter = 'A' | 'B' | 'C';

describe('enumValues', () => {
  it('accepts the full member list', () => {
    const values = enumValues<Letter>()(['A', 'B', 'C']);
    expect(values).toEqual(['A', 'B', 'C']);
  });

  it('rejects a missing member at compile time', () => {
    // @ts-expect-error C is missing
    enumValues<Letter>()(['A', 'B']);
  });

  it('rejects an extra member at compile time', () => {
    // @ts-expect-error D is not a Letter
    enumValues<Letter>()(['A', 'B', 'C', 'D']);
  });
});
