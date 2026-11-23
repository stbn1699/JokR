-- Notifications push : les appareils abonnés de chaque joueur (un abonnement par navigateur ou app installée).
create table push_subscriptions
(
    id         uuid primary key     default gen_random_uuid(),
    user_id    uuid        not null references users (id) on delete cascade,
    -- adresse fournie par le service de push du navigateur
    endpoint   text        not null unique,
    p256dh     text        not null,
    auth       text        not null,
    created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on push_subscriptions (user_id, created_at desc);

-- Dernière version de la notification envoyée en push : à envoyer tant que pushed_at diffère de created_at
-- (une notification remise à neuf, ex. nouvelle demande d'ami, change de created_at et repart donc en push)
alter table notifications
    add column pushed_at timestamptz;

-- Les notifications existantes ne partent pas en push
update notifications
set pushed_at = created_at;

create index notifications_push_pending_idx on notifications (created_at) where pushed_at is distinct from created_at;
