-- Questions du Quizz proposées par les joueurs (page d'un thème, bouton « + » pour en ajouter autant qu'on veut).
-- Les questions de base sont écrites dans le code du site ; celles-ci s'y ajoutent une fois validées.
--
-- topic_id : identifiant du thème (ex. star-wars, voir backend/src/utils/quizz.ts)
-- answers  : les 4 réponses, la bonne en premier (mélangées pendant la partie)
-- status   : pending (en attente), approved (jouable), rejected (refusée) ; décidé par un administrateur,
--            qui peut corriger la question avant de la valider (reviewed_by, reviewed_at)
create table quizz_questions
(
    id          uuid primary key      default gen_random_uuid(),
    topic_id    varchar(60)  not null,
    question    varchar(200) not null,
    answers     text[]       not null check (cardinality(answers) = 4),
    author_id   uuid         references users (id) on delete set null,
    status      varchar(10)  not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    created_at  timestamptz  not null default now(),
    reviewed_by uuid         references users (id) on delete set null,
    reviewed_at timestamptz
);

create index quizz_questions_topic_status_idx on quizz_questions (topic_id, status);
create index quizz_questions_pending_idx on quizz_questions (created_at) where status = 'pending';
