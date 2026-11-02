-- Nouvelle courbe de progression (voir backend/src/utils/leveling.ts) :
--   ancienne : XP pour passer du niveau n au suivant = ceil(120 × n^1.4)
--   nouvelle : ceil(2050 × (1 − e^(−n / 20)))
-- Chaque joueur garde son niveau, avec sa barre remplie au même pourcentage
-- (ex : niveau 40 rempli à 15 % → niveau 40 rempli à 15 %). Idem pour les niveaux par jeu.

update users
set user_xp = least(
        floor(user_xp::numeric / ceil(120 * power(user_level, 1.4)) * ceil(2050 * (1 - exp(-user_level / 20.0)))),
        ceil(2050 * (1 - exp(-user_level / 20.0))) - 1
    )::int;

update game_stats
set game_xp = least(
        floor(game_xp::numeric / ceil(120 * power(game_level, 1.4)) * ceil(2050 * (1 - exp(-game_level / 20.0)))),
        ceil(2050 * (1 - exp(-game_level / 20.0))) - 1
    )::int;
