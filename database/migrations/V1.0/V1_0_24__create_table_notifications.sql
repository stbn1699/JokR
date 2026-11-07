-- Notifications des joueurs (cloche du header).
-- kind : sorte de notification (daily_results : places aux défis d'un jour, envoyée à leur clôture)
-- ref  : ce qu'elle concerne (ex. la date du défi) ; une seule notification par joueur, sorte et ref
-- data : contenu affiché (JSON), propre à chaque sorte
create table notifications
(
    id         uuid primary key     default gen_random_uuid(),
    user_id    uuid        not null references users (id) on delete cascade,
    kind       varchar(32) not null,
    ref        varchar(64) not null,
    data       jsonb       not null,
    created_at timestamptz not null default now(),
    -- null tant que le joueur ne l'a pas vue
    read_at    timestamptz,
    unique (user_id, kind, ref)
);

create index notifications_user_created_idx on notifications (user_id, created_at desc);
