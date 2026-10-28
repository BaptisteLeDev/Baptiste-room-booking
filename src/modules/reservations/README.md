# Contexte Réservations

Gère le cycle de vie des réservations de salles. Contrat : `core/openapi.yml` (`/reservations*`, `ReservationStatus`, `Reservation`).

## Langage

| Terme métier           | Code                                                         | Sens                                                                                      |
| ---------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Réservation            | `Reservation`                                                | Demande d'occupation d'une Salle par un Utilisateur sur un Créneau.                       |
| Demande de réservation | `Reservation.request`                                        | Création ; statut initial `PENDING`.                                                      |
| Créneau                | `TimeSlot` (`startAt`/`endAt`)                               | Intervalle [début, fin[ ; fin exclue, donc deux créneaux adjacents ne se chevauchent pas. |
| Plage de disponibilité | `AvailabilitySlot` (contexte Rooms)                          | Horaire d'ouverture hebdomadaire d'une salle. À ne pas confondre avec Créneau.            |
| Statuts                | `PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `COMPLETED` | En attente, Confirmée, Refusée, Annulée, Terminée.                                        |
| Réservation active     | `isActive` (`PENDING`, `CONFIRMED`)                          | Seules les actives bloquent un créneau.                                                   |
| Modification           | `amend` (domaine) / `updateReservation` (PATCH)              | Changer créneau, participants, commentaire.                                               |
| Conditions de la salle | `RoomTerms` (`capacity`, `pricePerHour`)                     | Ce que Réservations lit de Rooms via le port `RoomCatalog`.                               |
| Montant total          | `totalAmount`                                                | `pricePerHour` x durée en heures, arrondi à 2 décimales, EUR.                             |

### Transitions de statut

| Depuis                 | Action              | Vers                         |
| ---------------------- | ------------------- | ---------------------------- |
| `PENDING`              | confirmer           | `CONFIRMED`                  |
| `PENDING`              | refuser             | `REJECTED`                   |
| `PENDING`, `CONFIRMED` | annuler             | `CANCELLED`                  |
| `CONFIRMED`            | modifier le créneau | `PENDING`                    |
| `CONFIRMED`            | `endAt` dépassé     | `COMPLETED` (non implémenté) |

Toute autre transition : 409 `RESERVATION_STATUS_CONFLICT`.

## Frontières

- Possède les réservations.
- Lit les conditions et le propriétaire d'une salle via le port `RoomCatalog` (`domain/room-catalog.ts`, `ROOM_CATALOG`). Adaptateur : `TypeOrmRoomCatalog`, lit la table `rooms` via sa propre vue `RoomRow` (`infra/room-row.entity.ts`, `synchronize: false`), sans dépendre de `rooms/infra`.
- Utilisateur courant : `@CurrentUserId()`, posé par `AuthGuard` (Auth). Les droits passent par `AuthorizationService` et `ReservationAccess` (`application/reservation-access.ts`) : client, gestionnaire de la salle ou admin ; un étranger reçoit 404.
- Référence `users` via `UserRow` (`infra/user-row.entity.ts`, clé étrangère seulement, `synchronize: false`).

## Provenance des données

PostgreSQL, table `reservations`, via `TypeOrmReservationRepository` (`ReservationEntity`). Contrainte d'exclusion `no_overlap_active` : un conflit de créneau remonte en 409 `SLOT_UNAVAILABLE`. Port : `RESERVATION_REPOSITORY`. Un use case par action dans `application/use-cases/`. `InMemoryReservationRepository` (`test/helpers/`) sert aux tests unitaires.

## Invariants

- Créneau : début strictement avant la fin (400 `VALIDATION_ERROR`).
- Participants : au plus la capacité de la salle (400 `VALIDATION_ERROR`).
- Une réservation active ne chevauche aucune autre réservation active de la même salle (409 `SLOT_UNAVAILABLE`), vérifié sous verrou de la ligne `rooms` (création et changement de créneau) ; la contrainte `no_overlap_active` reste le filet. La sienne propre n'est pas comptée lors d'une modification.
- Modifier le créneau d'une réservation `CONFIRMED` la repasse en `PENDING` et recalcule le montant.
- Seules `PENDING` et `CONFIRMED` sont modifiables.
- Salle inconnue ou réservation inconnue : 404 `NOT_FOUND`.

## ADR

- [0001 - Verrouiller la ligne salle pour réserver](../../../docs/decisions/0001-lock-room-row-for-booking.md)
- [0002 - Ports à jeton](../../../docs/decisions/0002-ports-a-jeton.md)
- [0003 - Ports inter-contextes](../../../docs/decisions/0003-ports-inter-contextes.md)
