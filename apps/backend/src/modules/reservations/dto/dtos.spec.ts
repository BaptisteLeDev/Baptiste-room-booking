import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { MAX_PAGE } from '../../../common/database/paginate.js';
import { check, props } from '../../../common/validation/dto-test-helpers.js';
import type {
  ReservationCreateRequest,
  ReservationRejectRequest,
  ReservationUpdateRequest,
} from '../../../contract.js';
import { CreateReservationDto } from './create-reservation.dto.js';
import { ListReservationsQueryDto } from './list-reservations-query.dto.js';
import { RejectReservationDto } from './reject-reservation.dto.js';
import { UpdateReservationDto } from './update-reservation.dto.js';

const ROOM_ID = '3f2c8a4e-9b1d-4e7a-8c5f-2a6b7d8e9f01';

describe('ListReservationsQueryDto paging', () => {
  it('rejects page whose offset would overflow int4', async () => {
    const errors = await check(ListReservationsQueryDto, { page: 1e22 });
    expect(props(errors)).toContain('page');
  });

  it('accepts the largest page for pageSize 100', async () => {
    const errors = await check(ListReservationsQueryDto, {
      page: MAX_PAGE,
      pageSize: 100,
    });
    expect(errors).toHaveLength(0);
  });
});

describe('CreateReservationDto', () => {
  const valid: ReservationCreateRequest = {
    roomId: ROOM_ID,
    startAt: '2026-11-02T09:00:00Z',
    endAt: '2026-11-02T10:00:00Z',
    numberOfParticipants: 4,
    comment: 'Projecteur',
  };
  const minimal: ReservationCreateRequest = {
    roomId: ROOM_ID,
    startAt: '2026-11-02T09:00:00Z',
    endAt: '2026-11-02T10:00:00Z',
  };

  it('accepts a full payload', async () => {
    expect(await check(CreateReservationDto, valid)).toHaveLength(0);
  });

  it('accepts a minimal payload', async () => {
    expect(await check(CreateReservationDto, minimal)).toHaveLength(0);
  });

  it.each(['roomId', 'startAt', 'endAt'])(
    'rejects missing %s',
    async (field) => {
      const errors = await check(CreateReservationDto, {
        ...valid,
        [field]: undefined,
      });
      expect(props(errors)).toContain(field);
    },
  );

  it('rejects roomId that is not a uuid', async () => {
    const errors = await check(CreateReservationDto, {
      ...valid,
      roomId: 'not-a-uuid',
    });
    expect(props(errors)).toContain('roomId');
  });

  it('rejects startAt that is not an ISO 8601 date-time', async () => {
    const errors = await check(CreateReservationDto, {
      ...valid,
      startAt: 'not-a-date',
    });
    expect(props(errors)).toContain('startAt');
  });

  it('rejects endAt that is not an ISO 8601 date-time', async () => {
    const errors = await check(CreateReservationDto, {
      ...valid,
      endAt: 'tomorrow',
    });
    expect(props(errors)).toContain('endAt');
  });

  it('rejects date-only startAt (date-time required)', async () => {
    const errors = await check(CreateReservationDto, {
      ...valid,
      startAt: '2026-01-01',
    });
    expect(props(errors)).toContain('startAt');
  });

  it('rejects numberOfParticipants below 1', async () => {
    const errors = await check(CreateReservationDto, {
      ...valid,
      numberOfParticipants: 0,
    });
    expect(props(errors)).toContain('numberOfParticipants');
  });

  it('rejects non-integer numberOfParticipants', async () => {
    const errors = await check(CreateReservationDto, {
      ...valid,
      numberOfParticipants: 2.5,
    });
    expect(props(errors)).toContain('numberOfParticipants');
  });

  it('rejects comment over 1000 characters', async () => {
    const errors = await check(CreateReservationDto, {
      ...valid,
      comment: 'a'.repeat(1001),
    });
    expect(props(errors)).toContain('comment');
  });
  it('rejects non-string comment', async () => {
    const errors = await check(CreateReservationDto, { ...valid, comment: 42 });
    expect(props(errors)).toContain('comment');
  });
  it.each(['numberOfParticipants', 'comment'])(
    'rejects null %s',
    async (field) => {
      const errors = await check(CreateReservationDto, { [field]: null });
      expect(props(errors)).toContain(field);
    },
  );
});

describe('UpdateReservationDto', () => {
  const valid: ReservationUpdateRequest = { comment: 'Déplacé' };

  it('accepts a partial payload', async () => {
    expect(await check(UpdateReservationDto, valid)).toHaveLength(0);
  });

  it('accepts a full payload', async () => {
    const errors = await check(UpdateReservationDto, {
      startAt: '2026-11-03T09:00:00Z',
      endAt: '2026-11-03T10:00:00Z',
      numberOfParticipants: 2,
      comment: 'Autre',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty object (minProperties 1)', async () => {
    const errors = await check(UpdateReservationDto, {});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects startAt that is not an ISO 8601 date-time', async () => {
    const errors = await check(UpdateReservationDto, { startAt: 'nope' });
    expect(props(errors)).toContain('startAt');
  });

  it('rejects endAt that is not an ISO 8601 date-time', async () => {
    const errors = await check(UpdateReservationDto, { endAt: 'nope' });
    expect(props(errors)).toContain('endAt');
  });

  it('rejects date-only endAt (date-time required)', async () => {
    const errors = await check(UpdateReservationDto, { endAt: '2026-01-01' });
    expect(props(errors)).toContain('endAt');
  });

  it('rejects numberOfParticipants below 1', async () => {
    const errors = await check(UpdateReservationDto, {
      numberOfParticipants: 0,
    });
    expect(props(errors)).toContain('numberOfParticipants');
  });
  it('rejects comment over 1000 characters', async () => {
    const errors = await check(UpdateReservationDto, {
      comment: 'a'.repeat(1001),
    });
    expect(props(errors)).toContain('comment');
  });

  it.each(['startAt', 'endAt', 'numberOfParticipants', 'comment'])(
    'rejects null %s',
    async (field) => {
      const errors = await check(UpdateReservationDto, { [field]: null });
      expect(props(errors)).toContain(field);
    },
  );
});

describe('RejectReservationDto', () => {
  const empty: ReservationRejectRequest = {};
  const withReason: ReservationRejectRequest = { reason: 'Salle indisponible' };

  it('accepts an empty body (reason optional)', async () => {
    expect(await check(RejectReservationDto, empty)).toHaveLength(0);
  });

  it('accepts a reason', async () => {
    expect(await check(RejectReservationDto, withReason)).toHaveLength(0);
  });

  it('rejects non-string reason', async () => {
    const errors = await check(RejectReservationDto, { reason: 42 });
    expect(props(errors)).toContain('reason');
  });
  it.each(['reason'])('rejects null %s', async (field) => {
    const errors = await check(RejectReservationDto, { [field]: null });
    expect(props(errors)).toContain(field);
  });
});

describe('ListReservationsQueryDto', () => {
  it('defaults page to 1 and pageSize to 20', () => {
    const query = plainToInstance(ListReservationsQueryDto, {});
    expect(query.page).toBe(1);
    expect(query.pageSize).toBe(20);
  });

  it('keeps explicit page and pageSize', () => {
    const query = plainToInstance(ListReservationsQueryDto, {
      page: 3,
      pageSize: 50,
    });
    expect(query.page).toBe(3);
    expect(query.pageSize).toBe(50);
  });
});
