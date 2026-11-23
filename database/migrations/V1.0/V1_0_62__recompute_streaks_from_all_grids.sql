-- Flamme au lancement : recalculée d'après toutes les grilles terminées (jours de Paris), y compris celles qui
-- n'ont rien rapporté (niveau ou défi rejoué) : un jour joué ne casse jamais une série
with days as (select user_id, (finished_at at time zone 'Europe/Paris')::date as day
              from game_results
              union
              select user_id, (finished_at at time zone 'Europe/Paris')::date
              from daily_results
              union
              select user_id, (completed_at at time zone 'Europe/Paris')::date
              from puzzle_level_progress
              union
              select user_id, (finished_at at time zone 'Europe/Paris')::date
              from game_sessions
              where user_id is not null
                and finished_at is not null),
     runs as (select user_id, count(*)::int as length, max(day) as last_day
              from (select user_id, day, day - (row_number() over (partition by user_id order by day))::int as run
                    from days) d
              group by user_id, run),
     summary as (select distinct on (user_id) user_id,
                                              length                                  as current_length,
                                              last_day,
                                              max(length) over (partition by user_id) as best_length
                 from runs
                 order by user_id, last_day desc)
update users u
set streak_days      = s.current_length,
    streak_best      = greatest(u.streak_best, s.best_length),
    streak_last_date = s.last_day
from summary s
where s.user_id = u.id;
