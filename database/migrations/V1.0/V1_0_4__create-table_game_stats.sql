CREATE TABLE game_stats
(
    user_id   uuid REFERENCES users (id) ON DELETE CASCADE,
    game_id   int REFERENCES games (id) ON DELETE CASCADE,
    games_won INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, game_id)
)