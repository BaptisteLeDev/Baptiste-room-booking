import type {
  AvailabilityPeriod,
  IRoomRepository,
} from '../domain/repositories/room.repository.interface.js';
import { AvailabilityLoader } from './availability.loader.js';

const periodA: AvailabilityPeriod = {
  startAt: new Date('2099-11-02T09:00:00Z'),
  endAt: new Date('2099-11-02T12:00:00Z'),
  available: true,
};

const loaderWith = (result: AvailabilityPeriod[][]) => {
  const calls: (readonly string[])[] = [];
  const rooms = {
    findUpcomingAvailabilities: async (ids: readonly string[]) => {
      calls.push(ids);
      return result;
    },
  } as unknown as IRoomRepository;
  return { loader: new AvailabilityLoader(rooms), calls };
};

describe('AvailabilityLoader', () => {
  it('batches loads from one tick into one port call', async () => {
    const { loader, calls } = loaderWith([[], []]);
    await Promise.all([
      loader.byRoom.load('a'),
      loader.byRoom.load('b'),
      loader.byRoom.load('a'),
    ]);
    expect(calls).toEqual([['a', 'b']]);
  });

  it('keeps results aligned to keys', async () => {
    const { loader } = loaderWith([[periodA], []]);
    const [a, b] = await Promise.all([
      loader.byRoom.load('a'),
      loader.byRoom.load('b'),
    ]);
    expect(a).toEqual([periodA]);
    expect(b).toEqual([]);
  });
});
