-- Thèmes du Quizz créés par les joueurs (page /quizz/creer).
-- Un thème se prépare en brouillon (enregistré automatiquement, repris plus tard), puis est soumis : il attend la
-- validation d'un administrateur. Validé, il reçoit son identifiant d'adresse (slug, ex. le-seigneur-des-anneaux) et
-- ses questions passent dans quizz_questions (topic_id = slug, déjà validées).
--
-- status    : draft (brouillon), pending (soumis), approved (jouable), rejected (refusé, l'auteur peut le reprendre)
-- wiki_url  : article Wikipédia choisi ; summary : son introduction, lue par le serveur à la soumission
-- questions : [{ question, answers: [bonne, mauvaise, mauvaise, mauvaise] }] tant que le thème n'est pas validé
create table quizz_themes
(
    id           uuid primary key      default gen_random_uuid(),
    author_id    uuid         references users (id) on delete set null,
    status       varchar(10)  not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected')),
    slug         varchar(60) unique,
    name         varchar(60)  not null default '',
    description  varchar(160) not null default '',
    category     varchar(20)  not null default '',
    color        varchar(9)   not null default '',
    wiki_url     varchar(300) not null default '',
    wiki_title   varchar(200),
    summary      text[],
    questions    jsonb        not null default '[]',
    created_at   timestamptz  not null default now(),
    updated_at   timestamptz  not null default now(),
    submitted_at timestamptz,
    reviewed_by  uuid         references users (id) on delete set null,
    reviewed_at  timestamptz
);

create index quizz_themes_author_idx on quizz_themes (author_id, updated_at desc);
create index quizz_themes_status_idx on quizz_themes (status);
