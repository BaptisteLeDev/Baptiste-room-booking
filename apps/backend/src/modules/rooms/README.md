# Contexte Rooms

Gère le catalogue des salles et leurs plages de disponibilité. Contrat : `core/openapi.yml` (`/rooms*`, `Room`, `AvailabilitySlot`).

## Langage

| Terme métier           | Code                                  | Sens                                                                                                 |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Salle                  | `Room` / `RoomEntity`                 | Espace réservable, avec capacité, lieu, équipements et prix horaire.                                 |
| Plage de disponibilité | `AvailabilitySlot` / `availabilities` | Horaire d'ouverture d'une salle sur une journée. À ne pas confondre avec le Créneau de Réservations. |
| Statut de salle        | `status` (`ACTIVE`, `INACTIVE`)       | Une salle `INACTIVE` reste en base et listée, mais n'est plus réservable.                            |

## Frontières

- Possède les salles et leurs plages de disponibilité.
- Lit les réservations (table `reservations`) pour calculer `available` et pour refuser la suppression d'une salle qui en a. Aucun appel au contexte Réservations.
- Propriétaire : utilisateur courant `@CurrentUserId()`, posé par `AuthGuard` (Auth). Clé étrangère vers `users` via `OwnerRow` (`infra/owner-row.entity.ts`, `synchronize: false`), sans dépendre de `users/infra`.

## Provenance des données

PostgreSQL, tables `rooms` et `availabilities`, via TypeORM (`RoomEntity`, `AvailabilityEntity`).
Couches : `domain/` (entité `Room` avec invariants, port `IRoomRepository`, token `ROOM_REPOSITORY`), `application/use-cases/` (un use case par action), `infra/` (adaptateur `TypeOrmRoomRepository`, mapper, entités TypeORM, DTO HTTP dans `dto/` (racine du module)), câblage dans `rooms.module.ts`.

## Invariants

- Capacité >= 1, prix horaire >= 0 (contraintes SQL et DTO).
- Plage : fin strictement après début (contrainte SQL).
- Heures saisies et affichées en `Europe/Paris`. Stockage en `timestamptz`.
- `available` renvoyé à la lecture n'est jamais stocké : calculé, faux si la plage est fermée (`available: false`) ou si une réservation `PENDING_PAYMENT` ou `CONFIRMED` chevauche la plage.
- `replaceAvailability` (`PUT /rooms/:roomId/availability`) remplace les plages du jour donné. Les créneaux `available: false` sont stockés.
- Supprimer une salle supprime ses plages (cascade). Une salle ayant des réservations ne peut pas être supprimée (409 `ROOM_HAS_RESERVATIONS`).
- Salle inconnue : 404 `NOT_FOUND`.
- Nom <= 100, lieu <= 255, URL d'image <= 2048 caractères (colonnes SQL) : 400 `VALIDATION_ERROR` au-delà.
- Pagination : `page` <= 21 474 836 (`page` x `pageSize` tient dans un int4 de OFFSET) : 400 au-delà.
- Recherche `search` et `location` : `%` et `_` saisis sont des caractères littéraux (LIKE échappé).
- Modifier, supprimer une salle ou changer ses plages : le propriétaire doit encore être gestionnaire (ou admin). Propriétaire redevenu `CLIENT` : 403.
- Filtres de disponibilité sur `GET /rooms` (`date`, `startTime`, `endTime`, `available`) appliqués seulement si `date` est fourni ; sans `date`, ils sont ignorés.

## GraphQL

Adaptateurs dans `graphql/` (lecture seule, voir ADR 0005) :

- `room(id)` -> `GetRoomUseCase`.
- `searchRooms(filter: RoomSearchInput)` -> `ListRoomsUseCase` (`minCapacity`, `maxPricePerHour`, pagination).
- `Room.availabilities` : plages à venir (`end_time > now()`), via `AvailabilityLoader` -> `IRoomRepository.findUpcomingAvailabilities` (une requête pour toutes les salles).

## ADR

- [0002 - Ports à jeton](../../../docs/decisions/0002-ports-a-jeton.md)
- [0005 - API GraphQL en lecture](../../../docs/decisions/0005-graphql-lecture.md)
