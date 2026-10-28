import 'reflect-metadata';
import { CreateReservationDto } from '../../modules/reservations/dto/create-reservation.dto.js';
import { UpdateAvailabilityDto } from '../../modules/rooms/infra/dto/update-availability.dto.js';
import { check } from './dto-test-helpers.js';
import { validationDetails } from './validation-details.js';

describe('validationDetails', () => {
  it('maps a failing field to its messages', async () => {
    const errors = await check(CreateReservationDto, {
      roomId: 'x',
      startAt: '2026-11-02T09:00:00Z',
      endAt: '2026-11-02T10:00:00Z',
    });
    const details = validationDetails(errors);
    expect(details.roomId.length).toBeGreaterThan(0);
  });

  it('uses dotted paths for nested errors', async () => {
    const errors = await check(UpdateAvailabilityDto, {
      date: '2026-11-02',
      slots: [{ startTime: 'bad', endTime: '12:00', available: true }],
    });
    expect(
      validationDetails(errors)['slots.0.startTime'].length,
    ).toBeGreaterThan(0);
  });
});
