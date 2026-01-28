alter table game_stats
    add column game_level int not null default 1,
    add column game_xp    int not null default 0;