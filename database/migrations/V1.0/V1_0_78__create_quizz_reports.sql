-- Questions du Quizz contestées par les joueurs (fin de partie : « la réponse me semble fausse »).
-- La question est gardée telle qu'elle a été jouée : elle peut venir du site (écrite dans le code) ou d'un joueur
-- (quizz_questions), et une question du site n'a pas d'identifiant en base.
--
-- topic_id : thème de la question (son thème d'origine pour une partie qui mélange plusieurs thèmes)
-- answers  : les 4 réponses, la bonne (celle du jeu) en premier ; picked : la réponse choisie par le joueur (vide :
--            pas répondu)
-- reason   : l'explication du joueur (facultative)
-- status   : pending (à examiner), fixed (question corrigée), dismissed (la réponse était juste) ; décidé par un
--            administrateur pour toutes les contestations de la même question à la fois
-- Un joueur ne conteste qu'une fois la même question (une nouvelle contestation remplace la précédente).
create table quizz_reports
(
    id          uuid primary key      default gen_random_uuid(),
    topic_id    varchar(60)  not null,
    question    varchar(200) not null,
    answers     text[]       not null check (cardinality(answers) = 4),
    picked      varchar(80),
    reason      varchar(300) not null default '',
    reporter_id uuid         references users (id) on delete cascade,
    status      varchar(10)  not null default 'pending' check (status in ('pending', 'fixed', 'dismissed')),
    created_at  timestamptz  not null default now(),
    reviewed_by uuid         references users (id) on delete set null,
    reviewed_at timestamptz,
    unique (reporter_id, topic_id, question)
);

create index quizz_reports_pending_idx on quizz_reports (created_at) where status = 'pending';
