# 0002. Ports à jeton pour les repositories

- Statut : Acceptée
- Date : 2026-10-28

## Contexte

Les use cases doivent rester testables sans base ni réseau, et l'adaptateur
(TypeORM, mémoire, fournisseur externe) doit pouvoir changer sans toucher au
domaine. Une interface TypeScript n'existe pas à l'exécution : NestJS ne peut pas
l'injecter seule.

## Décision

Chaque port est une interface dans `domain/` avec un `Symbol` exporté à côté
(`ROOM_REPOSITORY`, `USER_REPOSITORY`, `RESERVATION_REPOSITORY`,
`PAYMENT_REPOSITORY`, `ROOM_CATALOG`, `ADMIN_QUERY`, `PASSWORD_HASHER`...). Les use
cases reçoivent le port par `@Inject(TOKEN)`. Le module lie le jeton à
l'adaptateur : `{ provide: TOKEN, useClass: Adapter }`.

## Conséquences

- Les tests unitaires passent un faux (ex. `InMemoryReservationRepository`)
  au constructeur, sans module Nest.
- Changer d'adaptateur se fait dans le module seul.
- Coût : un jeton et une ligne de câblage par port ; l'oubli d'`@Inject` casse
  l'injection à l'exécution, pas à la compilation.
