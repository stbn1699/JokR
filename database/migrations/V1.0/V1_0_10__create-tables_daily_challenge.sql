-- Défi du jour : une grille par jeu et par jour, la même pour tout le monde
create table daily_challenges
(
    challenge_date date        not null,
    game_code      text        not null references games (code) on delete cascade,
    puzzle         jsonb       not null,
    grid_size      int         not null,
    empty_cells    int         not null,
    created_at     timestamptz not null default now(),
    primary key (challenge_date, game_code)
);

-- Résultats du défi : une seule réussite comptée par joueur, jeu et jour
create table daily_results
(
    challenge_date date        not null,
    game_code      text        not null,
    user_id        uuid        not null references users (id) on delete cascade,
    duration_ms    int         not null,
    finished_at    timestamptz not null default now(),
    primary key (challenge_date, game_code, user_id),
    foreign key (challenge_date, game_code) references daily_challenges (challenge_date, game_code) on delete cascade
);

-- Classement du jour : les plus rapides d'abord
create index daily_results_ranking_idx on daily_results (challenge_date, game_code, duration_ms);
