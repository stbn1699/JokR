alter table users
    add column user_level int not null default 1,
    add column user_xp    int not null default 0;