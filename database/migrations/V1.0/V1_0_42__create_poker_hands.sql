-- Poker à 5 cartes en solo (vidéo poker, voir backend/src/utils/poker.ts) : la main en cours de chaque joueur,
-- gardée par le serveur (paquet compris). Une seule main en cours par joueur ; une fois finie, elle est enregistrée
-- dans casino_plays (jeu « poker ») et gardée ici pour l'historique.
create table poker_hands
(
    id         uuid primary key     default gen_random_uuid(),
    user_id    uuid        not null references users (id) on delete cascade,
    state      jsonb       not null,
    -- jouée en mode admin : sans crédits, absente des statistiques
    ghost      boolean     not null default false,
    finished   boolean     not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index poker_hands_active_idx on poker_hands (user_id) where not finished;
create index poker_hands_recent_idx on poker_hands (user_id, created_at desc);
