-- Défis entre amis : la grille d'une partie gagnée, envoyée à des amis pour qu'ils la fassent aussi.
-- La grille est gardée telle quelle (JSON) : les amis peuvent la jouer quand ils veulent.
create table friend_challenges
(
    id          uuid primary key     default gen_random_uuid(),
    sender_id   uuid        not null references users (id) on delete cascade,
    game_code   text        not null references games (code),
    puzzle      jsonb       not null,
    grid_size   integer     not null,
    empty_cells integer     not null,
    -- temps de celui qui a lancé le défi
    sender_ms   integer     not null,
    created_at  timestamptz not null default now()
);

-- Amis défiés : partie lancée pour ce défi (pour vérifier leur temps) et temps à la première réussite
create table friend_challenge_players
(
    challenge_id uuid        not null references friend_challenges (id) on delete cascade,
    user_id      uuid        not null references users (id) on delete cascade,
    game_id      varchar(64),
    duration_ms  integer,
    finished_at  timestamptz,
    primary key (challenge_id, user_id)
);

create index friend_challenge_players_user_idx on friend_challenge_players (user_id);
