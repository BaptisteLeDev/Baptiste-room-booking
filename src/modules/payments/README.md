# Contexte Paiements

Enregistre le paiement d'une réservation. Contrat : `core/openapi.yml` (`/payments*`, `Payment`).

## Langage

| Terme métier        | Code                                        | Sens                                                                        |
| ------------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| Paiement            | `Payment` / `PaymentSnapshot`               | Règlement lié à une réservation, avec montant, devise et statut.            |
| Statuts             | `PENDING`, `PAID`, `FAILED`, `REFUNDED`     | Seul `PENDING` est produit aujourd'hui (le fournisseur est différé).        |
| Fournisseur         | `PaymentProvider` (`initiate`)              | Service externe de paiement. Adaptateur actuel : `DeferredPaymentProvider`. |
| Réservation payable | `PayableReservation` (`ReservationCatalog`) | Ce que Paiements lit de Réservations : id, utilisateur, montant, devise.    |

## Frontières

- Possède les paiements.
- Lit les réservations via le port `ReservationCatalog` (`domain/ports/reservation-catalog.port.ts`). Adaptateur `TypeOrmReservationCatalog` : requête SQL en lecture sur la table `reservations`, sans importer `reservations/infra`.
- Fournisseur de paiement : aucun configuré. `DeferredPaymentProvider` laisse le paiement `PENDING`, sans transaction externe ni URL.

## Provenance des données

PostgreSQL, table `payments`, via `TypeOrmPaymentRepository` (`PaymentEntity`, `payment.mapper.ts`). Montant et devise copiés de la réservation à la création. Couches : `domain/` (entité, ports `PAYMENT_REPOSITORY`, `RESERVATION_CATALOG`, `PAYMENT_PROVIDER`), `application/use-cases/` (`create-payment`, `get-payment`), `infra/`, câblage dans `payments.module.ts`.

## Invariants

- Montant fini et >= 0, devise sur 3 caractères : 400 `INVALID_PAYMENT`.
- Statut limité à quatre valeurs (contrainte SQL `CHECK`).
- Seules les réservations `PENDING_PAYMENT` et `CONFIRMED` sont payables : 409 `RESERVATION_NOT_PAYABLE`.
- Une réservation a au plus un paiement : 409 `PAYMENT_ALREADY_EXISTS`.
- Réservation inconnue : 404 `NOT_FOUND`. Seul son auteur peut la payer : 403 sinon.
- `GET /payments/:id` d'un autre client : 404 `NOT_FOUND`, identique à un id inconnu (pas de fuite d'existence). Admin : accès.
- Aucune transition de statut implémentée (pas de `markPaid`) : à ajouter avec un vrai fournisseur.

## ADR

- [0002 - Ports à jeton](../../../docs/decisions/0002-ports-a-jeton.md)
- [0003 - Ports inter-contextes](../../../docs/decisions/0003-ports-inter-contextes.md)
