-- Boutique : objets achetés avec des crédits (pour l'instant les fonds du site), et fond choisi par le joueur.
-- Le catalogue (objets, prix) est dans le code (backend/src/utils/shop.ts) : ici, seulement ce que chacun possède.
create table user_items
(
    user_id      uuid        not null references users (id) on delete cascade,
    item_id      varchar(40) not null,
    -- crédits payés (le prix peut changer ensuite)
    price        integer     not null,
    purchased_at timestamptz not null default now(),
    primary key (user_id, item_id)
);

-- Fond du site choisi (null : le fond par défaut, gratuit)
alter table users
    add column background varchar(40);
