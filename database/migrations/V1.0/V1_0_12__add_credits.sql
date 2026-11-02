-- Crédits du joueur (gagnés en finissant des puzzles, misés plus tard sur les jeux de hasard)
alter table users
    add column credits int not null default 0;

-- Crédits gagnés à chaque partie (historique)
alter table game_results
    add column credits int not null default 0;
