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
- Lit les conditions d'une salle via le port `RoomCatalog` (`domain/room-catalog.ts`). Adaptateur : `TypeOrmRoomCatalog`, lit la table `rooms`.
- Utilisateur courant : constante issue de `userFixture` dans le contrôleur, en attendant un guard d'authentification.

## Provenance des données

PostgreSQL, table `reservations`, via `TypeOrmReservationRepository` (`ReservationEntity`). Contrainte d'exclusion `no_overlap_active` : un conflit de créneau remonte en 409 `SLOT_UNAVAILABLE`. Port : `RESERVATION_REPOSITORY`. `InMemoryReservationRepository` reste pour les tests unitaires.

## Invariants

- Créneau : début strictement avant la fin (400 `VALIDATION_ERROR`).
- Participants : au plus la capacité de la salle (400 `VALIDATION_ERROR`).
- Une réservation active ne chevauche aucune autre réservation active de la même salle (409 `SLOT_UNAVAILABLE`) ; la sienne propre n'est pas comptée lors d'une modification.
- Modifier le créneau d'une réservation `CONFIRMED` la repasse en `PENDING` et recalcule le montant.
- Seules `PENDING` et `CONFIRMED` sont modifiables.
- Salle inconnue ou réservation inconnue : 404 `NOT_FOUND`.

## ADR

Aucun.
