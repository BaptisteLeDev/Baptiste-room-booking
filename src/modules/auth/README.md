# Contexte Auth

Authentification (inscription, connexion, jeton) et contrôle d'accès par rôle. Contrat : `core/openapi.yml` (`/auth*`).

## Langage

| Terme métier         | Code                             | Sens                                                                        |
| -------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Jeton                | `TokenIssuer` (`sign`, `verify`) | JWT signé avec `JWT_SECRET`, porte l'id utilisateur.                        |
| Jeton révoqué        | `RevokedTokenStore`              | Jeton invalidé par la déconnexion jusqu'à son expiration.                   |
| Hash de mot de passe | `PasswordHasher`                 | `hash` / `verify`.                                                          |
| Autorisation         | `AuthorizationService`           | `assertAdmin`, `assertManager`, `assertOwnerOrAdmin`, `requireSelfOrAdmin`. |
| Route publique       | `@Public()`                      | Sans ce décorateur, `AuthGuard` (global) exige un jeton Bearer.             |

## Frontières

- Ne possède aucune table. Lit et écrit les comptes via `USER_REPOSITORY` (Utilisateurs, `UsersPersistenceModule`).
- Exporte `AuthorizationService` aux autres contextes (Salles, Réservations, Paiements, Admin, Utilisateurs).
- `AuthGuard` est enregistré en `APP_GUARD` : tout est protégé par défaut.

## Provenance des données

Pas de base propre. Ports dans `domain/` (`PASSWORD_HASHER`, `TOKEN_ISSUER`, `REVOKED_TOKEN_STORE`), adaptateurs dans `infra/` : `ScryptPasswordHasher`, `JwtTokenIssuer`, `InMemoryRevokedTokenStore`. Use cases dans `application/use-cases/` (`register`, `login`, `logout`, `me`, `change-password`). Câblage dans `auth.module.ts`.

## Invariants

- Identifiants invalides (e-mail inconnu ou mauvais mot de passe) : même erreur (`invalidCredentials`), pas de fuite sur l'existence du compte.
- E-mail déjà pris à l'inscription : 409 `EMAIL_ALREADY_USED`.
- Changement de mot de passe : l'ancien doit être valide.
- Jeton absent, invalide, expiré ou révoqué : 401.
- Jeton émis avant le dernier changement de mot de passe (à la seconde près) : 401.
- Rôle inconnu de la base ou insuffisant : 403.
- `JWT_SECRET` obligatoire au démarrage.
- `POST /auth/register`, `POST /auth/login`, `PATCH /auth/password` : 5 requêtes/min/IP, sinon 429.
- Connexion avec e-mail inconnu : un `verify` factice est exécuté (même coût que mauvais mot de passe).
- La liste des jetons révoqués est en mémoire : perdue au redémarrage, non partagée entre instances.

## ADR

- [0002 - Ports à jeton](../../../docs/decisions/0002-ports-a-jeton.md)
- [0003 - Ports inter-contextes](../../../docs/decisions/0003-ports-inter-contextes.md)
