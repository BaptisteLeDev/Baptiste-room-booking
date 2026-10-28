export const rejection = <E = unknown>(p: Promise<unknown>): Promise<E> =>
  p.then(
    () => {
      throw new Error('did not reject');
    },
    (e: unknown) => e as E,
  );
