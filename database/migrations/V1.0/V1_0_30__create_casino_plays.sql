-- Parties des jeux de hasard (onglet Hasard). Une ligne par mise : ce qui a été misé, gagné, et de quoi
-- rejouer le tirage (pour le Plinko, la graine de la chute : même graine, même chute).
-- game : plinko pour l'instant
create table casino_plays
(
    id         uuid primary key     default gen_random_uuid(),
    user_id    uuid        not null references users (id) on delete cascade,
    game       varchar(16) not null,
    bet        integer     not null check (bet > 0),
    payout     integer     not null check (payout >= 0),
    seed       bigint      not null,
    -- résultat du tirage (Plinko : numéro de la case)
    outcome    smallint    not null,
    created_at timestamptz not null default now()
);

create index casino_plays_user_idx on casino_plays (user_id, created_at desc);
