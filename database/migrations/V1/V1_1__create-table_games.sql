CREATE TABLE games
(
    id          SERIAL PRIMARY KEY,
    code        TEXT NOT NULL,
    designation TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);