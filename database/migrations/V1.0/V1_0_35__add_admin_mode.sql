-- Mode admin (« mode fantôme ») : un administrateur peut tout tester sans laisser de trace
-- (crédits illimités, niveau max, cosmétiques débloquées ; ses parties et mises ne comptent nulle part).
alter table users
    add column admin_mode boolean not null default false;

-- Jetons de roulette posés en mode admin : invisibles des autres joueurs, sans crédits retirés ni gagnés,
-- et absents des statistiques
alter table roulette_bets
    add column ghost boolean not null default false;
