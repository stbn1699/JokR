-- Amis : une demande (pending) envoyée par requester à addressee, puis acceptée (accepted).
-- Refuser, annuler ou retirer un ami supprime la ligne. Une seule ligne par paire de joueurs, dans un sens ou l'autre.
create table friendships
(
    requester_id uuid        not null references users (id) on delete cascade,
    addressee_id uuid        not null references users (id) on delete cascade,
    status       varchar(10) not null default 'pending' check (status in ('pending', 'accepted')),
    created_at   timestamptz not null default now(),
    accepted_at  timestamptz,
    primary key (requester_id, addressee_id),
    check (requester_id <> addressee_id)
);

create unique index friendships_pair_idx on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on friendships (addressee_id);
