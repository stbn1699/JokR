-- Onglet Social : discussion entre ami·e·s et duels.
--
-- Duel : une grille choisie par jeu et difficulté, jouée par les deux (celui qui la lance aussi). Il réutilise
-- friend_challenges : `difficulty` est remplie, `sender_ms` reste vide (le temps de chacun est dans
-- friend_challenge_players, où celui qui lance le duel a aussi sa ligne).
alter table friend_challenges
    alter column sender_ms drop not null;

alter table friend_challenges
    add column difficulty text;

-- Messages entre deux joueurs : un texte, ou un défi (carte affichée dans la discussion)
create table social_messages
(
    id           uuid primary key     default gen_random_uuid(),
    sender_id    uuid        not null references users (id) on delete cascade,
    recipient_id uuid        not null references users (id) on delete cascade,
    body         varchar(500),
    challenge_id uuid references friend_challenges (id) on delete cascade,
    created_at   timestamptz not null default now(),
    -- lu par le destinataire
    read_at      timestamptz,
    constraint social_messages_text_or_challenge check ((body is null) <> (challenge_id is null))
);

-- Discussion d'une paire de joueurs, dans l'ordre (quel que soit celui qui écrit)
create index social_messages_pair_idx
    on social_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);

-- Messages pas encore lus (pastille de l'onglet, compteurs de la liste d'amis)
create index social_messages_unread_idx on social_messages (recipient_id) where read_at is null;
