# 0003. Ports inter-contextes

- Statut : Acceptée
- Date : 2026-10-28

## Contexte

Réservations a besoin des conditions d'une salle (capacité, prix, propriétaire).
Paiements a besoin du montant d'une réservation. Auth a besoin des utilisateurs.
Importer le `infra/` ou les repositories d'un autre contexte couple les
contextes et ramène TypeORM dans leurs use cases.

## Décision

Le contexte consommateur définit son propre port, en lecture seule, dans son
`domain/` :

- Réservations : `RoomCatalog` (`ROOM_CATALOG`), adaptateur `TypeOrmRoomCatalog`
  sur la vue `RoomRow` de la table `rooms` (`synchronize: false`). `UserRow`
  sert de cible de clé étrangère pour `users`.
- Paiements : `ReservationCatalog` (`RESERVATION_CATALOG`), adaptateur
  `TypeOrmReservationCatalog` (SQL en lecture sur `reservations`).
  `ReservationRow` sert de cible de clé étrangère pour `reservations`.
- Auth, exception : lit et écrit les comptes via le port d'Utilisateurs
  `USER_REPOSITORY`, exporté par `UsersPersistenceModule` (pas son `infra/`),
  et crée les comptes par `User.create` du domaine Utilisateurs.

Aucun contexte n'importe `*/infra` d'un autre.

## Conséquences

- Les contextes se testent isolément avec un faux du port.
- Coût : le schéma de `rooms` est décrit deux fois (`rooms/infra` et
  `reservations/infra/room-row.entity.ts`), celui de `reservations` en SQL dans
  Paiements. Un changement de colonne doit être répercuté à la main.
- Le propriétaire de la salle est lu sans appel au contexte Salles : pas de
  garantie transactionnelle entre les deux, cohérent avec l'ADR 0001.
