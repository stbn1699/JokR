-- Roulette en direct : une table commune, un tour toutes les 30 secondes (voir backend/src/utils/roulette.ts).
-- roulette_rounds : numéro tiré à chaque tour, à la fermeture des mises (id = numéro du tour, temps Unix / 30 s)
create table roulette_rounds
(
    id       bigint primary key,
    number   smallint    not null check (number between 0 and 36),
    drawn_at timestamptz not null default now()
);

-- roulette_bets : jetons posés pendant un tour (crédits retirés tout de suite).
-- payout : gain de ce jeton, rempli quand le tour est payé (null tant que le tour n'est pas payé)
create table roulette_bets
(
    id         uuid primary key     default gen_random_uuid(),
    round_id   bigint      not null,
    user_id    uuid        not null references users (id) on delete cascade,
    key        varchar(16) not null,
    amount     integer     not null check (amount > 0),
    payout     integer check (payout >= 0),
    created_at timestamptz not null default now()
);

create index roulette_bets_round_idx on roulette_bets (round_id, user_id);
-- tours dont il reste des jetons à payer (le serveur les cherche chaque seconde)
create index roulette_bets_unpaid_idx on roulette_bets (round_id) where payout is null;
