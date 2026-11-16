import { DomainError } from '../../../../common/domain-error.js';

export type RoomStatus = 'ACTIVE' | 'INACTIVE';

export type RoomSnapshot = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  capacity: number;
  location: string;
  equipment: string[];
  pricePerHour: number;
  status: RoomStatus;
  imageUrl?: string;
  createdAt: string;
};

export type NewRoom = Pick<
  RoomSnapshot,
  | 'id'
  | 'createdAt'
  | 'ownerId'
  | 'name'
  | 'description'
  | 'capacity'
  | 'location'
  | 'equipment'
  | 'pricePerHour'
  | 'imageUrl'
>;

export type RoomChanges = Partial<
  Pick<
    RoomSnapshot,
    | 'name'
    | 'description'
    | 'capacity'
    | 'location'
    | 'equipment'
    | 'pricePerHour'
    | 'imageUrl'
    | 'status'
  >
>;

const invalid = (message: string) =>
  new DomainError('invalid', 'INVALID_ROOM', message);

export class Room {
  private constructor(private state: RoomSnapshot) {}

  static create(input: NewRoom): Room {
    const room = new Room({ ...input, status: 'ACTIVE' });
    room.validate();
    return room;
  }

  static restore(state: RoomSnapshot): Room {
    return new Room({ ...state });
  }

  get ownerId(): string {
    return this.state.ownerId;
  }

  update(changes: RoomChanges): void {
    this.state = {
      ...this.state,
      name: changes.name ?? this.state.name,
      description: changes.description ?? this.state.description,
      capacity: changes.capacity ?? this.state.capacity,
      location: changes.location ?? this.state.location,
      equipment: changes.equipment ?? this.state.equipment,
      pricePerHour: changes.pricePerHour ?? this.state.pricePerHour,
      imageUrl: changes.imageUrl ?? this.state.imageUrl,
      status: changes.status ?? this.state.status,
    };
    this.validate();
  }

  toSnapshot(): RoomSnapshot {
    return { ...this.state, equipment: [...this.state.equipment] };
  }

  private validate(): void {
    const { name, capacity, location, pricePerHour } = this.state;
    if (!name.trim()) throw invalid('Le nom de la salle est requis.');
    if (!Number.isInteger(capacity) || capacity < 1)
      throw invalid('La capacité doit être un entier supérieur ou égal à 1.');
    if (!location.trim()) throw invalid('Le lieu est requis.');
    if (pricePerHour < 0) throw invalid('Le prix horaire doit être positif.');
  }
}
