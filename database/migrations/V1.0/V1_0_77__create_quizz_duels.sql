-- Duels du Quizz : 7 questions, les mêmes pour les deux joueurs.
-- - Chacun son tour : le premier joueur (challenger) fait sa partie, puis son adversaire joue face à ses réponses
--   rejouées. Contre un·e ami·e (opponent_id donné), ou au hasard (random : opponent_id vide tant que personne ne l'a
--   pris, puis le joueur tiré au sort ; claimed_at : quand il l'a pris, repris par un autre au bout de 30 min s'il
--   ne l'a pas joué).
-- - En direct (live, entre amis) : le challenger attend dans le salon (challenger_seen_at : sa dernière visite),
--   son ami·e le rejoint (started_at : début de la partie, quelques secondes plus tard) ; chaque réponse est
--   envoyée dès qu'elle est donnée.
--
-- questions   : [{ question, answers (4), correct }] (JSON), dans l'ordre joué
-- *_answers   : réponses de chaque joueur [{ index (null : temps écoulé), ms }] (JSON) ; *_score : ses points
-- finished_at : quand les deux ont joué
create table quizz_duels
(
    id                 uuid primary key     default gen_random_uuid(),
    topic_id           varchar(60) not null,
    random             boolean     not null,
    live               boolean     not null default false,
    questions          jsonb       not null,
    challenger_id      uuid        not null references users (id) on delete cascade,
    challenger_answers jsonb       not null default '[]',
    challenger_score   integer,
    challenger_seen_at timestamptz,
    opponent_id        uuid references users (id) on delete cascade,
    claimed_at         timestamptz,
    opponent_answers   jsonb       not null default '[]',
    opponent_score     integer,
    created_at         timestamptz not null default now(),
    started_at         timestamptz,
    finished_at        timestamptz,
    check (random or opponent_id is not null),
    check (not (random and live))
);

-- duels au hasard qui attendent un adversaire, par thème
create index quizz_duels_open_idx on quizz_duels (topic_id, created_at) where random and finished_at is null;
create index quizz_duels_challenger_idx on quizz_duels (challenger_id, topic_id);
create index quizz_duels_opponent_idx on quizz_duels (opponent_id, topic_id);
