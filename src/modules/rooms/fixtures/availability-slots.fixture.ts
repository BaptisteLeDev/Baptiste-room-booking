import type { AvailabilitySlot } from '../../../contract.js';

export const availabilitySlotsFixture: AvailabilitySlot[] = [
  { startTime: '09:00', endTime: '10:00', available: true },
  { startTime: '10:00', endTime: '11:00', available: false },
  { startTime: '11:00', endTime: '12:00', available: true },
];
