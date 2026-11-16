# 0005. API GraphQL en lecture

- Statut : Acceptée
- Date : 2026-10-29

## Contexte

Le tableau de bord gestionnaire affiche une salle, ses plages à venir et ses
réservations en attente. En REST, cela coûte 3 appels, ou une route taillée
pour un seul écran. Résoudre les champs imbriqués salle par salle provoque du
N+1 en SQL.

## Décision

Endpoint GraphQL `/graphql` à côté de REST, en lecture seule (aucune
mutation), code-first (`@nestjs/graphql` + Apollo).

- Jeton Bearer exigé sur toute opération, même pour les salles (publiques en
  REST) : les champs résolus ne passent pas par les guards, `Room.reservations`
  a besoin du `userId` posé par la requête.
- Les resolvers sont des adaptateurs, comme les contrôleurs : ils appellent les
  use cases et les ports, jamais TypeORM.
- `Room.availabilities` et `Room.reservations` passent par des DataLoaders
  scopés à la requête (`AvailabilityLoader`, `RoomReservationsLoader`), adossés
  à des méthodes de lot sur les ports existants : une requête SQL par champ,
  quel que soit le nombre de salles.
- Erreurs : HTTP 200 avec `errors[]`. `extensions.code` et `extensions.status`
  reprennent le code et le statut REST (`ApiExceptionFilter`). 5xx masqué.
- `Room.reservations` : même règle que la gestion de salle (propriétaire encore
  gestionnaire, ou admin). Sinon champ `null` + `FORBIDDEN`, la salle reste
  renvoyée.

## Conséquences

- REST reste l'API d'écriture et le contrat OpenAPI (`core/openapi.yml`).
- Schéma `src/schema.gql` régénéré au démarrage, versionné.
- Introspection, Apollo Sandbox et CSP `helmet` assouplie seulement avec
  `GRAPHQL_SANDBOX=true` (opt-in : un déploiement sans `NODE_ENV` reste fermé).
  Jamais de stacktrace dans les erreurs.
- Coût : le resolver de Réservations importe `RoomType` de `rooms/graphql`
  (code-first ne lie pas un champ à un type par son nom). Dépendance limitée à
  l'adaptateur, pas au domaine.
- Coût : la règle d'accès aux réservations d'une salle existe en deux endroits
  (`rooms/application/room-access.ts` et `RoomReservationsResolver`).
- Hors périmètre : mutations, abonnements, limite de complexité (schéma sans
  cycle, `pageSize <= 100`).
