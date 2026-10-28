# Architecture

Backend NestJS en contextes (`src/modules/<contexte>/`). Dépendances : `infra` -> `application` -> `domain`, jamais l'inverse. Un contexte n'importe pas le `infra/` d'un autre. Décisions : [`docs/decisions/`](docs/decisions/).

| Contexte                                           | Rôle                                                      |
| -------------------------------------------------- | --------------------------------------------------------- |
| [Rooms](src/modules/rooms/README.md)               | Catalogue des salles et plages de disponibilité.          |
| [Reservations](src/modules/reservations/README.md) | Cycle de vie des réservations, anti-chevauchement.        |
| [Users](src/modules/users/README.md)               | Comptes et rôles.                                         |
| [Auth](src/modules/auth/README.md)                 | Inscription, connexion, jeton, contrôle d'accès par rôle. |
| [Payments](src/modules/payments/README.md)         | Paiement d'une réservation (fournisseur différé).         |
| [Admin](src/modules/admin/README.md)               | Lecture seule : réservations globales et statistiques.    |
