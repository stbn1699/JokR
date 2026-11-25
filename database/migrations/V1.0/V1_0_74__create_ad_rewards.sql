-- Pubs récompensées : le joueur regarde une pub (Google H5 Games Ads) et gagne des crédits, quelques fois par jour.
--
-- Une ligne par pub lancée : le serveur la crée juste avant la pub (started_at), puis la marque regardée
-- (claimed_at, credits) quand le site revient après la fin de la pub. Seules les pubs regardées comptent
-- dans la limite du jour (reward_date : jour de Paris, comme la roue du jour).
create table ad_rewards
(
    id          uuid primary key     default gen_random_uuid(),
    user_id     uuid        not null references users (id) on delete cascade,
    reward_date date        not null,
    started_at  timestamptz not null default now(),
    claimed_at  timestamptz,
    credits     integer     not null default 0
);

create index ad_rewards_user_date_idx on ad_rewards (user_id, reward_date);
