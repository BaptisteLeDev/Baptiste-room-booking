# Contexte Auth

Authentification (inscription, connexion, jeton) et contrôle d'accès par rôle. Contrat : `core/openapi.yml` (`/auth*`).

## Langage

| Terme métier         | Code                             | Sens                                                                        |
| -------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| Jeton                | `TokenIssuer` (`sign`, `verify`) | JWT HS256 signé avec `JWT_SECRET`, porte `sub`, `jti` et `ver`.             |
| Jeton révoqué        | `RevokedTokenStore`              | `jti` invalidé par la déconnexion jusqu'à l'expiration du jeton.            |
| Hash de mot de passe | `PasswordHasher`                 | `hash` / `verify`.                                                          |
| Autorisation         | `AuthorizationService`           | `assertAdmin`, `assertManager`, `assertOwnerOrAdmin`, `requireSelfOrAdmin`. |
| Route publique       | `@Public()`                      | Sans ce décorateur, `AuthGuard` (global) exige un jeton Bearer.             |

## Frontières

- Possède la table `revoked_tokens` (`RevokedTokenEntity`). Lit et écrit les comptes via `USER_REPOSITORY` (Utilisateurs, `UsersPersistenceModule`).
- Exporte `AuthorizationService` aux autres contextes (Salles, Réservations, Paiements, Admin, Utilisateurs).
- `AuthGuard` est enregistré en `APP_GUARD` : tout est protégé par défaut.

## Provenance des données

Table `revoked_tokens` (PostgreSQL). Ports dans `domain/` (`PASSWORD_HASHER`, `TOKEN_ISSUER`, `REVOKED_TOKEN_STORE`), adaptateurs dans `infra/` : `ScryptPasswordHasher`, `JwtTokenIssuer`, `TypeOrmRevokedTokenStore`. Use cases dans `application/use-cases/` (`register`, `login`, `logout`, `me`, `change-password`). Câblage dans `auth.module.ts`.

## Invariants

- Identifiants invalides (e-mail inconnu ou mauvais mot de passe) : même erreur (`invalidCredentials`), pas de fuite sur l'existence du compte.
- E-mail déjà pris à l'inscription : 409 `EMAIL_ALREADY_USED`.
- Changement de mot de passe : l'ancien doit être valide.
- Jeton absent, invalide, expiré ou révoqué : 401. Jeton sans `jti` ou `ver` : 401.
- Jeton dont `ver` diffère de la `token_version` du compte : 401. Un changement de mot de passe incrémente la version, même dans la même seconde.
- Rôle inconnu de la base ou insuffisant : 403.
- `JWT_SECRET` obligatoire au démarrage, 32 caractères minimum. Algorithme HS256 imposé à la signature et à la vérification.
- Mot de passe : 8 à 128 caractères (inscription, connexion, changement).
- Hash `scrypt$v2$N$r$p$salt$hash` (N=2^17, r=8, p=1). L'ancien format `scrypt$salt$hash` reste vérifiable ; une connexion réussie le rehashe si les paramètres sont obsolètes, conditionnel à l'ancien hash.
- `POST /auth/register`, `POST /auth/login`, `PATCH /auth/password` : 5 requêtes/min/IP, sinon 429.
- Connexion avec e-mail inconnu : un `verify` factice est exécuté (même coût que mauvais mot de passe).
- Jetons révoqués en base, purge paresseuse des entrées expirées à chaque révocation.

## ADR

- [0002 - Ports à jeton](../../../docs/decisions/0002-ports-a-jeton.md)
- [0003 - Ports inter-contextes](../../../docs/decisions/0003-ports-inter-contextes.md)
