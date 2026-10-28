# Contexte Rooms

Gère le catalogue des salles et leurs plages de disponibilité. Contrat : `core/openapi.yml` (`/rooms*`, `Room`, `AvailabilitySlot`).

## Langage

| Terme métier           | Code                                  | Sens                                                                                                 |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Salle                  | `Room` / `RoomEntity`                 | Espace réservable, avec capacité, lieu, équipements et prix horaire.                                 |
| Plage de disponibilité | `AvailabilitySlot` / `availabilities` | Horaire d'ouverture d'une salle sur une journée. À ne pas confondre avec le Créneau de Réservations. |
| Statut de salle        | `status` (`ACTIVE`, `INACTIVE`)       | Une salle `INACTIVE` reste en base, mais n'est plus proposée.                                        |

## Frontières

- Possède les salles et leurs plages de disponibilité.
- Lit les réservations (table `reservations`) pour calculer `available` et pour refuser la suppression d'une salle qui en a. Aucun appel au contexte Réservations.
- Propriétaire : utilisateur de démo `userFixture`, en attendant un guard d'authentification.

## Provenance des données

PostgreSQL, tables `rooms` et `availabilities`, via TypeORM (`RoomEntity`, `AvailabilityEntity`).
Couches : `domain/` (entité `Room` avec invariants, port `IRoomRepository`, token `ROOM_REPOSITORY`), `application/use-cases/` (un use case par action), `infra/` (adaptateur `TypeOrmRoomRepository`, mapper, entités TypeORM, DTO HTTP dans `infra/dto/`), câblage dans `rooms.module.ts`.

## Invariants

- Capacité >= 1, prix horaire >= 0 (contraintes SQL et DTO).
- Plage : fin strictement après début (contrainte SQL).
- Heures saisies et affichées en `Europe/Paris`. Stockage en `timestamptz`.
- `available` n'est jamais stocké : calculé à la lecture, faux si une réservation `PENDING` ou `CONFIRMED` chevauche la plage.
- `setAvailability` remplace les plages du jour donné. Les créneaux `available: false` ne sont pas stockés.
- Supprimer une salle supprime ses plages (cascade). Une salle ayant des réservations ne peut pas être supprimée (409 `ROOM_HAS_RESERVATIONS`).
- Salle inconnue : 404 `NOT_FOUND`.
- Filtres de disponibilité sur `GET /rooms` (`date`, `startTime`, `endTime`, `available`) acceptés mais ignorés pour l'instant.

## ADR

- [0002 - Ports à jeton](../../../docs/decisions/0002-ports-a-jeton.md)
