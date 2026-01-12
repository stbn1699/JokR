CREATE TABLE games
(
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    description TEXT NOT NULL,
    icon_url    TEXT NOT NULL,
    game_url    TEXT NOT NULL
);