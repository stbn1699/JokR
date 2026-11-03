-- Comptes externes liés à un joueur (connexion avec Google, Discord...)
-- Un compte externe ne peut appartenir qu'à un seul joueur, et un joueur a au plus un compte par fournisseur.
create table user_identities
(
    provider         varchar(20)  not null,
    -- identifiant du compte chez le fournisseur (sub Google, id Discord)
    provider_user_id varchar(100) not null,
    user_id          uuid         not null references users (id) on delete cascade,
    -- email et nom affiché chez le fournisseur au moment de la dernière connexion
    email            varchar(255),
    display_name     varchar(100),
    created_at       timestamptz  not null default now(),
    primary key (provider, provider_user_id),
    unique (user_id, provider)
);

-- Un joueur inscrit avec Google ou Discord n'a pas forcément de mot de passe,
-- ni d'email (Discord ne donne l'email que s'il est vérifié)
alter table users
    alter column password drop not null,
    alter column email drop not null;
