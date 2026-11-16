-- Tickets de loterie offerts (cases « tickets » de la roue du jour, voir backend/src/utils/wheel.ts), en plus de ceux
-- gagnés en misant. Ils comptent pour la loterie `kind` dont la période contient created_at, et n'ajoutent rien
-- à la cagnotte (qui reste une part des crédits misés).
create table lottery_bonus_tickets
(
    id         serial primary key,
    user_id    uuid        not null references users (id) on delete cascade,
    kind       varchar(8)  not null check (kind in ('day', 'week', 'month')),
    tickets    integer     not null check (tickets > 0),
    -- d'où viennent les tickets (wheel : roue du jour)
    source     varchar(16) not null default 'wheel',
    created_at timestamptz not null default now()
);

create index lottery_bonus_tickets_period_idx on lottery_bonus_tickets (kind, created_at);
