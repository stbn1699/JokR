-- Roue du jour du Hasard (voir backend/src/utils/wheel.ts) : un lancer gratuit par joueur et par jour
-- (heure de Paris). La clé primaire empêche un deuxième lancer le même jour, même avec deux requêtes à la fois.
create table daily_wheel_spins
(
    user_id    uuid        not null references users (id) on delete cascade,
    spin_date  date        not null,
    -- case de la roue (index dans WHEEL_SEGMENTS)
    segment    smallint    not null,
    credits    integer     not null default 0,
    xp         integer     not null default 0,
    created_at timestamptz not null default now(),
    primary key (user_id, spin_date)
);
