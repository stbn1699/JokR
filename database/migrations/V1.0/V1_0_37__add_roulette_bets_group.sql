-- Roulette : geste du joueur qui a posé chaque jeton (un clic, un glisser sur le tapis, « Reproduire ma mise »).
-- « Annuler la dernière mise » retire tous les jetons du dernier geste. null : jeton posé avant cette colonne.
alter table roulette_bets
    add column bet_group varchar(16);
