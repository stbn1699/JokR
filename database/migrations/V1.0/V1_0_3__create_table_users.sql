CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users
(
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username   varchar(100) NOT NULL UNIQUE,
    email      varchar(255) NOT NULL UNIQUE,
    password   varchar(255) NOT NULL,
    created_at TIMESTAMPTZ      DEFAULT now()
);
