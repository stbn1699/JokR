-- Blackjack en solo (voir backend/src/utils/blackjack.ts) : la main en cours de chaque joueur, gardée par le serveur
-- (sabot et carte cachée du croupier compris). Une seule main en cours par joueur ; une fois finie, elle est
-- enregistrée dans casino_plays (jeu « blackjack ») et gardée ici pour l'historique.
create table blackjack_hands
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

create unique index blackjack_hands_active_idx on blackjack_hands (user_id) where not finished;
create index blackjack_hands_recent_idx on blackjack_hands (user_id, created_at desc);
