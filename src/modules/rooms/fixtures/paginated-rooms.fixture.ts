import type { PaginatedRooms } from '../../../contract.js';
import { roomFixture } from './room.fixture.js';

export const paginatedRoomsFixture: PaginatedRooms = {
  page: 1,
  pageSize: 20,
  total: 1,
  items: [roomFixture],
};
