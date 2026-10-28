# Contexte Utilisateurs

Gère les comptes et leurs rôles. Contrat : `core/openapi.yml` (`/users*`, `User`). L'inscription et la connexion sont dans Auth.

## Langage

| Terme métier | Code                                             | Sens                                                                      |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------------------- |
| Utilisateur  | `User` / `UserSnapshot`                          | Compte avec nom, e-mail unique et rôle. `toSnapshot` n'expose pas le hash. |
| Rôle         | `Role` (`CLIENT`, `GESTIONNAIRE`, `ADMINISTRATEUR`) | `CLIENT` par défaut à la création.                                        |

## Frontières

- Possède les utilisateurs. Port `IUserRepository` (token `USER_REPOSITORY`).
- `UsersPersistenceModule` exporte `USER_REPOSITORY` : Auth l'utilise pour s'inscrire, se connecter et lire les rôles (`AuthorizationService`). Aucun import de `users/infra` par les autres contextes.
- Lister, supprimer : admin. Modifier : soi-même ou admin ; changer le rôle : admin seulement.

## Provenance des données

PostgreSQL, table `users`, via `TypeOrmUserRepository` (`UserEntity`, mapper `user.mapper.ts`). Couches : `domain/entities/user.entity.ts`, `domain/repositories/`, `application/use-cases/` (un par action, `load-user.ts` pour le 404), `infra/` (adaptateur, mapper, entité TypeORM, DTO dans `infra/dto/`), câblage dans `users.module.ts` et `users-persistence.module.ts`.

## Invariants

- E-mail normalisé (trim, minuscules) et unique : 409 `EMAIL_ALREADY_USED`. Contrainte SQL `unique` en filet.
- Rôle limité à trois valeurs (contrainte SQL `CHECK`).
- Utilisateur inconnu : 404 `NOT_FOUND`.
- Non-admin qui modifie un autre compte ou son propre rôle : 403.

## ADR

- [0002 - Ports à jeton](../../../docs/decisions/0002-ports-a-jeton.md)
