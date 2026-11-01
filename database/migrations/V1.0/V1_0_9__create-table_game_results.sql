-- Une ligne par partie gagnée par un joueur connecté (historique, temps, records)
create table game_results
(
    id          bigserial primary key,
    user_id     uuid        not null references users (id) on delete cascade,
    game_code   text        not null references games (code) on delete cascade,
    grid_size   int         not null,
    empty_cells int         not null,
    duration_ms int         not null,
    xp          int         not null,
    finished_at timestamptz not null default now()
);

-- Dernières parties d'un joueur
create index game_results_user_recent_idx on game_results (user_id, finished_at desc);
-- Meilleur temps d'un joueur pour une configuration (jeu, taille, cases à remplir)
create index game_results_best_idx on game_results (user_id, game_code, grid_size, empty_cells, duration_ms);
