# 0004. Modèle de lecture admin

- Statut : Acceptée
- Date : 2026-10-28

## Contexte

L'administration liste toutes les réservations (filtres, pagination) et agrège
des statistiques sur plusieurs tables. Passer par les repositories des autres
contextes obligerait à y ajouter des requêtes transverses qui ne servent
qu'à l'admin.

## Décision

Admin possède un port de requêtes dédié, `AdminQuery` (`ADMIN_QUERY`), avec
l'adaptateur `TypeOrmAdminQuery`. Il lit `reservations` par sa propre vue
`AdminReservationRow` (`infra/admin-reservation-row.entity.ts`) et compte
`users` et `rooms` en SQL. Admin n'écrit rien. Le port retourne l'entité
`Reservation` du domaine Réservations.

## Conséquences

- Les repositories des autres contextes restent centrés sur leurs use cases.
- Coût : le schéma de `reservations` est décrit une 3e fois (avec
  `reservations/infra` et son filet SQL). Un changement de colonne doit être
  répercuté dans `AdminReservationRow`.
- Admin dépend du domaine Réservations (type `Reservation`), pas de son `infra/`.
- `AdminReservationRow` pose `synchronize: false`, comme `RoomRow` : le schéma
  de `reservations` reste géré par les migrations.
