-- Statistiques : une ligne par partie lancée (invités compris), terminée ou non
create table game_sessions
(
    id              bigserial primary key,
    -- identifiant de la partie côté serveur (null pour les parties reprises de game_results)
    game_id         uuid unique,
    game_code       text        not null references games (code) on delete cascade,
    -- free : partie libre, daily : défi du jour, replay : défi d'un jour passé
    mode            text        not null check (mode in ('free', 'daily', 'replay')),
    -- joueur connecté au lancement (ou à la victoire) ; reste null pour un invité ou un compte supprimé
    user_id         uuid        references users (id) on delete set null,
    logged_in       boolean     not null,
    grid_size       int         not null,
    empty_cells     int         not null,
    -- mobile, tablet ou desktop (lu dans le User-Agent), null si inconnu
    device          text check (device in ('mobile', 'tablet', 'desktop')),
    started_at      timestamptz not null default now(),
    finished_at     timestamptz,
    duration_ms     int,
    -- grilles envoyées fausses avant la victoire
    failed_attempts int         not null default 0
);

create index game_sessions_started_idx on game_sessions (started_at);
create index game_sessions_game_started_idx on game_sessions (game_code, started_at);
create index game_sessions_user_idx on game_sessions (user_id);

-- Dernière activité d'un joueur (joueurs actifs)
alter table users
    add column last_seen_at timestamptz;

-- Reprise de l'historique : chaque victoire déjà enregistrée devient une partie terminée
insert into game_sessions (game_code, mode, user_id, logged_in, grid_size, empty_cells, started_at, finished_at, duration_ms)
select r.game_code,
       case
           when exists (select 1
                        from daily_results d
                        where d.user_id = r.user_id
                          and d.game_code = r.game_code
                          and d.duration_ms = r.duration_ms) then 'daily'
           else 'free'
       end,
       r.user_id,
       true,
       r.grid_size,
       r.empty_cells,
       r.finished_at - r.duration_ms * interval '1 millisecond',
       r.finished_at,
       r.duration_ms
from game_results r;
