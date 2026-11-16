-- Mode Niveaux des puzzles (voir backend/src/utils/levels.ts) : niveaux réussis par chaque joueur, avec son meilleur temps.
-- L'XP et les crédits ne sont donnés qu'à la première réussite d'un niveau.
create table puzzle_level_progress
(
    user_id      uuid        not null references users (id) on delete cascade,
    game_code    varchar(32) not null,
    level        smallint    not null,
    best_ms      integer     not null,
    completed_at timestamptz not null default now(),
    primary key (user_id, game_code, level)
);
