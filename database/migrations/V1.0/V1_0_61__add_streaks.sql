-- Flamme : jours de suite avec au moins une grille réussie (jours de Paris)
alter table users
    add column streak_days          int not null default 0,
    add column streak_best          int not null default 0,
    add column streak_last_date     date,
    -- reste du bonus pas encore versé, en 200es d'unité (un petit pourcentage d'un petit gain finit par faire +1)
    add column streak_xp_carry      int not null default 0,
    add column streak_credits_carry int not null default 0;

-- Les joueurs gardent la série qu'ils ont déjà, d'après leurs parties gagnées
with days as (select distinct user_id, (finished_at at time zone 'Europe/Paris')::date as day
              from game_results),
     runs as (select user_id, count(*)::int as length, max(day) as last_day
              from (select user_id, day, day - (row_number() over (partition by user_id order by day))::int as run
                    from days) d
              group by user_id, run),
     summary as (select distinct on (user_id) user_id,
                                              length                                       as current_length,
                                              last_day,
                                              max(length) over (partition by user_id)      as best_length
                 from runs
                 order by user_id, last_day desc)
update users u
set streak_days      = s.current_length,
    streak_best      = s.best_length,
    streak_last_date = s.last_day
from summary s
where s.user_id = u.id;
