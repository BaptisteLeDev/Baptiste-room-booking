# 0001. Verrouiller la ligne salle pour réserver

- Statut : Acceptée
- Date : 2026-10-27

## Contexte

Deux réservations simultanées sur une même Salle peuvent se chevaucher. La
vérification de chevauchement lit les réservations existantes, puis insère :
si les deux transactions lisent avant l'insertion de l'autre, toutes deux
passent. Un verrou `FOR UPDATE` sur les lignes `reservations` qui chevauchent ne
protège pas ce cas : quand aucune ligne ne chevauche encore, rien n'est verrouillé
et les deux insertions passent (insertion fantôme).

## Décision

`TypeOrmReservationRepository.exclusive(roomId, work)` ouvre une seule transaction,
prend un verrou `FOR UPDATE` (`pessimistic_write`) sur la ligne de la table
`rooms`, puis exécute la vérification de chevauchement (`findOverlapping`) et
l'enregistrement via le repository de la transaction.

La contrainte d'exclusion `no_overlap_active` reste en dernier filet : une
violation (SQLSTATE `23P01`) remonte en 409 `SLOT_UNAVAILABLE`.

Les conditions de la salle (capacité, prix) sont lues avant de prendre le verrou.
Les lire via le catalogue à l'intérieur de la transaction
demanderait une 2e connexion du pool (max 10) : à partir d'environ 10 réservations
simultanées sur une même Salle, le pool serait épuisé et l'application bloquerait.
Compromis accepté : une modification de prix survenant à quelques millisecondes
d'une réservation donne l'ancien prix.

## Conséquences

- Les réservations d'une même Salle sont sérialisées ; des Salles différentes
  restent parallèles.
- Le test e2e du verrou prend `FOR NO KEY UPDATE` depuis une autre transaction.
  Un `FOR UPDATE` simple bloquerait aussi le verrou `FOR KEY SHARE` que pose
  l'insertion sur la clé étrangère, et le test passerait sans le verrou applicatif.
- Limite connue, reportée : confirmer, refuser, annuler et modifier hors
  changement de créneau enregistrent sans verrou. Une modification de créneau
  concurrente peut donc écraser une autre écriture (perte de mise à jour).
