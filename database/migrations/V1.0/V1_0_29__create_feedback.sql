-- Retours des joueurs (bouton « Un bug ? Une idée ? » en bas à droite, joueurs connectés).
-- kind : bug (signaler un problème) ou idea (suggérer une amélioration)
-- page : adresse de la page d'où le joueur a écrit ; user_agent : navigateur et appareil (pour reproduire un bug)
-- done_at : null tant que l'administrateur ne l'a pas marqué comme traité
create table feedback
(
    id         uuid primary key     default gen_random_uuid(),
    user_id    uuid        not null references users (id) on delete cascade,
    kind       varchar(8)  not null check (kind in ('bug', 'idea')),
    message    text        not null,
    page       varchar(200),
    user_agent varchar(300),
    created_at timestamptz not null default now(),
    done_at    timestamptz
);

create index feedback_created_idx on feedback (created_at desc);
