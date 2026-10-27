import type { Room } from '../../../contract.js';

export const roomFixture: Room = {
  id: '3f2c8a4e-9b1d-4e7a-8c5f-2a6b7d8e9f01',
  name: 'Salle Paris',
  description: 'Lumineuse, vue sur la Seine',
  capacity: 20,
  location: 'Paris',
  equipment: ['Wi-Fi', 'Vidéoprojecteur'],
  pricePerHour: 35,
  status: 'ACTIVE',
  ownerId: '5d0e9c1a-2b3c-4d5e-8f60-718293a4b5c6',
  imageUrl: 'https://example.com/room.jpg',
  createdAt: '2026-10-01T08:00:00Z',
};
