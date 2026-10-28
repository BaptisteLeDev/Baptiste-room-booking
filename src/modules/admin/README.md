# Contexte Admin

Vues d'administration en lecture seule : liste globale des réservations et statistiques. Contrat : `core/openapi.yml` (`/admin*`).

## Langage

| Terme métier | Code                           | Sens                                                                                   |
| ------------ | ------------------------------ | -------------------------------------------------------------------------------------- |
| Statistiques | `AdminStatistics`              | Totaux utilisateurs, salles, réservations (toutes, confirmées, annulées) et revenu.    |
| Revenu       | `totalRevenue`                 | Somme de `totalAmount` des réservations `CONFIRMED` et `COMPLETED` de la période.      |
| Modèle de lecture | `AdminQuery` (`ADMIN_QUERY`) | Port de requêtes dédié à l'admin, distinct des repositories des autres contextes.     |

## Frontières

- Ne possède aucune donnée et n'écrit rien.
- Lit `reservations` via sa propre vue `AdminReservationRow` (`infra/admin-reservation-row.entity.ts`) et compte `users` et `rooms` en SQL. Aucun import de `*/infra` d'un autre contexte.
- Le port retourne l'entité `Reservation` du domaine Réservations (import de `reservations/domain`).
- Chaque use case commence par `AuthorizationService.assertAdmin` : 403 sinon.

## Provenance des données

PostgreSQL, tables `reservations` (vue de lecture), `users` et `rooms` (comptages), via `TypeOrmAdminQuery`. Couches : `domain/repositories/admin-query.port.ts`, `application/use-cases/` (`list-admin-reservations`, `statistics`), `infra/`, DTO de requête dans `dto/`, câblage dans `admin.module.ts`.

## Invariants

- Réservé aux administrateurs : 403 sinon.
- Statistiques : `from` ne peut pas dépasser `to` (400 `INVALID_DATE_RANGE`). `to` est inclus (jusqu'à la fin du jour).
- Liste paginée (`page`, `pageSize`), filtrable par `status`, `roomId`, `userId`.

## ADR

- [0002 - Ports à jeton](../../../docs/decisions/0002-ports-a-jeton.md)
- [0004 - Modèle de lecture admin](../../../docs/decisions/0004-modele-de-lecture-admin.md)
