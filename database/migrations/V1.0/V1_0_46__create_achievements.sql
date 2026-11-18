-- Succès (voir backend/src/utils/achievements.ts) : succès débloqués par chaque joueur, avec la récompense versée.
-- seen_at : null tant que le site n'a pas montré la popup du déblocage.
create table user_achievements
(
    user_id        uuid        not null references users (id) on delete cascade,
    achievement_id varchar(64) not null,
    reward         integer     not null,
    unlocked_at    timestamptz not null default now(),
    seen_at        timestamptz,
    primary key (user_id, achievement_id)
);

create index user_achievements_unseen on user_achievements (user_id) where seen_at is null;

-- Statistiques des succès (compteurs, records, séries) tenues par backend/src/services/achievements
create table user_achievement_stats
(
    user_id uuid        not null references users (id) on delete cascade,
    key     varchar(96) not null,
    value   bigint      not null,
    primary key (user_id, key)
);
