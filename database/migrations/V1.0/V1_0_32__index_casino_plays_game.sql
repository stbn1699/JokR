-- Plinko en direct : le site demande chaque seconde les billes lâchées par les autres joueurs ces dernières secondes
create index casino_plays_game_idx on casino_plays (game, created_at desc);
