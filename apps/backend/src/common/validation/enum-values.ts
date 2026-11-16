// Keeps runtime enum lists in sync with contract union types.
export const enumValues =
  <T extends string>() =>
  <const A extends readonly T[]>(
    values: A & ([T] extends [A[number]] ? unknown : never),
  ): A =>
    values;
