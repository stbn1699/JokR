-- Statistiques du Quizz : toutes les parties (solo et duels, finies ou abandonnées) et chaque réponse donnée.
-- La partie est créée dès sa première question, chaque réponse est enregistrée dès qu'elle est donnée : une partie
-- abandonnée garde ses premières réponses (finished_at vide).
--
-- quizz_games
--   mode      : solo, random (duel au hasard), friend (duel entre amis chacun son tour), live (duel en direct)
--   duel_id   : le duel joué (quizz_duels), pour un duel
--   topic_id  : ce qui a été choisi : un thème, ou un mélange (tout, categorie-…, mix-…)
--   questions : les 7 questions dans l'ordre joué [{ key, question, answers, correct, topic, category }] (JSON)
--   answered  : nombre de réponses enregistrées ; score : points cumulés
-- quizz_answers : une ligne par réponse, prête pour les statistiques par question, thème, catégorie, mode, joueur
--   question_key : identifiant fixe de la question (site:<thème>:<numéro> pour une question du site, q:<uuid> pour
--                  une question des joueurs) : il ne change pas quand on corrige le texte
--   topic_id     : thème d'origine de la question ; category : sa catégorie au moment de la partie ;
--                  mix_id : le mélange joué (vide pour un thème seul)
--   picked       : place de la réponse choisie parmi les 4 affichées (vide : temps écoulé) ; correct, ms, points
create table quizz_games
(
    id          uuid primary key     default gen_random_uuid(),
    user_id     uuid        not null references users (id) on delete cascade,
    mode        varchar(10) not null check (mode in ('solo', 'random', 'friend', 'live')),
    duel_id     uuid        references quizz_duels (id) on delete set null,
    topic_id    varchar(60) not null,
    questions   jsonb       not null,
    answered    smallint    not null default 0,
    score       integer     not null default 0,
    created_at  timestamptz not null default now(),
    finished_at timestamptz
);

create index quizz_games_user_topic_idx on quizz_games (user_id, topic_id, mode);

create table quizz_answers
(
    game_id      uuid         not null references quizz_games (id) on delete cascade,
    round        smallint     not null check (round between 0 and 6),
    user_id      uuid         not null references users (id) on delete cascade,
    mode         varchar(10)  not null,
    question_key varchar(120) not null,
    question     varchar(200) not null,
    topic_id     varchar(60)  not null,
    category     varchar(20)  not null,
    mix_id       varchar(60),
    picked       smallint check (picked between 0 and 3),
    correct      boolean      not null,
    ms           integer      not null check (ms between 0 and 10000),
    points       smallint     not null,
    created_at   timestamptz  not null default now(),
    primary key (game_id, round)
);

create index quizz_answers_question_idx on quizz_answers (question_key);
create index quizz_answers_topic_idx on quizz_answers (topic_id, created_at);
create index quizz_answers_category_idx on quizz_answers (category, created_at);
create index quizz_answers_user_idx on quizz_answers (user_id, created_at);
