-- Loteries du Hasard (voir backend/src/utils/lottery.ts) : un tirage par jour, par semaine et par mois, à 23 h 59.
-- Chaque tranche de 10 crédits misés sur la période donne un ticket ; le gagnant reçoit une part des mises.
-- Une ligne par tirage, même sans gagnant (personne n'avait de ticket) : il n'est jamais refait.
create table lottery_draws
(
    id             serial primary key,
    kind           varchar(8)  not null check (kind in ('day', 'week', 'month')),
    -- jour du tirage (heure de Paris)
    draw_date      date        not null,
    -- période : du tirage précédent (exclu) au tirage (compris)
    period_start   timestamptz not null,
    period_end     timestamptz not null,
    total_bet      integer     not null,
    total_tickets  integer     not null,
    prize          integer     not null,
    winner_id      uuid references users (id) on delete set null,
    winner_tickets integer,
    drawn_at       timestamptz not null default now(),
    unique (kind, draw_date)
);

create index lottery_draws_recent_idx on lottery_draws (kind, draw_date desc);
