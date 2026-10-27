import 'reflect-metadata';
import { check, props } from '../../../common/validation/dto-test-helpers.js';
import type {
  AvailabilityUpdateRequest,
  RoomCreateRequest,
  RoomUpdateRequest,
} from '../../../contract.js';
import { CreateRoomDto } from './create-room.dto.js';
import { UpdateAvailabilityDto } from './update-availability.dto.js';
import { UpdateRoomDto } from './update-room.dto.js';

describe('CreateRoomDto', () => {
  const valid: RoomCreateRequest = {
    name: 'Salle Paris',
    description: 'Lumineuse',
    capacity: 20,
    location: 'Paris',
    equipment: ['Wi-Fi', 'Vidéoprojecteur'],
    pricePerHour: 35,
    imageUrl: 'https://example.com/room.jpg',
  };
  const minimal: RoomCreateRequest = {
    name: 'Salle',
    capacity: 1,
    location: 'Paris',
    pricePerHour: 0,
  };

  it('accepts a full payload', async () => {
    expect(await check(CreateRoomDto, valid)).toHaveLength(0);
  });

  it('accepts a minimal payload (capacity 1, price 0 boundaries)', async () => {
    expect(await check(CreateRoomDto, minimal)).toHaveLength(0);
  });

  it.each(['name', 'capacity', 'location', 'pricePerHour'])(
    'rejects missing %s',
    async (field) => {
      const errors = await check(CreateRoomDto, {
        ...valid,
        [field]: undefined,
      });
      expect(props(errors)).toContain(field);
    },
  );

  it('rejects capacity below 1', async () => {
    const errors = await check(CreateRoomDto, { ...valid, capacity: 0 });
    expect(props(errors)).toContain('capacity');
  });

  it('rejects non-integer capacity', async () => {
    const errors = await check(CreateRoomDto, { ...valid, capacity: 1.5 });
    expect(props(errors)).toContain('capacity');
  });

  it('rejects negative pricePerHour', async () => {
    const errors = await check(CreateRoomDto, { ...valid, pricePerHour: -1 });
    expect(props(errors)).toContain('pricePerHour');
  });

  it('rejects non-number pricePerHour', async () => {
    const errors = await check(CreateRoomDto, { ...valid, pricePerHour: '35' });
    expect(props(errors)).toContain('pricePerHour');
  });

  it('rejects malformed imageUrl', async () => {
    const errors = await check(CreateRoomDto, {
      ...valid,
      imageUrl: 'not a url',
    });
    expect(props(errors)).toContain('imageUrl');
  });

  it('rejects equipment with non-string item', async () => {
    const errors = await check(CreateRoomDto, { ...valid, equipment: [42] });
    expect(props(errors)).toContain('equipment');
  });
  it.each(['description', 'equipment', 'imageUrl'])(
    'rejects null %s',
    async (field) => {
      const errors = await check(CreateRoomDto, { [field]: null });
      expect(props(errors)).toContain(field);
    },
  );
});

describe('UpdateRoomDto', () => {
  const valid: RoomUpdateRequest = { status: 'ACTIVE' };

  it('accepts a partial payload', async () => {
    expect(await check(UpdateRoomDto, valid)).toHaveLength(0);
  });

  it('rejects an empty object (minProperties 1)', async () => {
    const errors = await check(UpdateRoomDto, {});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects capacity below 1', async () => {
    const errors = await check(UpdateRoomDto, { capacity: 0 });
    expect(props(errors)).toContain('capacity');
  });

  it('rejects negative pricePerHour', async () => {
    const errors = await check(UpdateRoomDto, { pricePerHour: -1 });
    expect(props(errors)).toContain('pricePerHour');
  });

  it('rejects malformed imageUrl', async () => {
    const errors = await check(UpdateRoomDto, { imageUrl: 'not a url' });
    expect(props(errors)).toContain('imageUrl');
  });

  it('rejects equipment with non-string item', async () => {
    const errors = await check(UpdateRoomDto, { equipment: [42] });
    expect(props(errors)).toContain('equipment');
  });

  it('rejects status outside RoomStatus enum', async () => {
    const errors = await check(UpdateRoomDto, { status: 'DELETED' });
    expect(props(errors)).toContain('status');
  });
  it.each([
    'name',
    'description',
    'capacity',
    'location',
    'equipment',
    'pricePerHour',
    'imageUrl',
    'status',
  ])('rejects null %s', async (field) => {
    const errors = await check(UpdateRoomDto, { [field]: null });
    expect(props(errors)).toContain(field);
  });
});

describe('UpdateAvailabilityDto', () => {
  const valid: AvailabilityUpdateRequest = {
    date: '2026-11-02',
    slots: [{ startTime: '09:00', endTime: '12:30', available: true }],
  };

  it('accepts a valid payload', async () => {
    expect(await check(UpdateAvailabilityDto, valid)).toHaveLength(0);
  });

  it('accepts TimeOfDay boundaries 00:00 and 23:59', async () => {
    const errors = await check(UpdateAvailabilityDto, {
      date: '2026-11-02',
      slots: [{ startTime: '00:00', endTime: '23:59', available: false }],
    });
    expect(errors).toHaveLength(0);
  });

  it.each(['date', 'slots'])('rejects missing %s', async (field) => {
    const errors = await check(UpdateAvailabilityDto, {
      ...valid,
      [field]: undefined,
    });
    expect(props(errors)).toContain(field);
  });

  it('rejects date not in YYYY-MM-DD form', async () => {
    const errors = await check(UpdateAvailabilityDto, {
      ...valid,
      date: '02/11/2026',
    });
    expect(props(errors)).toContain('date');
  });

  it('rejects slot startTime not matching TimeOfDay pattern', async () => {
    const errors = await check(UpdateAvailabilityDto, {
      ...valid,
      slots: [{ startTime: '9:00', endTime: '12:30', available: true }],
    });
    expect(props(errors)).toContain('slots.0.startTime');
  });

  it('rejects slot endTime out of range (24:00)', async () => {
    const errors = await check(UpdateAvailabilityDto, {
      ...valid,
      slots: [{ startTime: '09:00', endTime: '24:00', available: true }],
    });
    expect(props(errors)).toContain('slots.0.endTime');
  });

  it('rejects slot missing available', async () => {
    const errors = await check(UpdateAvailabilityDto, {
      ...valid,
      slots: [{ startTime: '09:00', endTime: '12:30', available: undefined }],
    });
    expect(props(errors)).toContain('slots.0.available');
  });

  it('rejects non-boolean slot available', async () => {
    const errors = await check(UpdateAvailabilityDto, {
      ...valid,
      slots: [{ startTime: '09:00', endTime: '12:30', available: 'yes' }],
    });
    expect(props(errors)).toContain('slots.0.available');
  });
});
