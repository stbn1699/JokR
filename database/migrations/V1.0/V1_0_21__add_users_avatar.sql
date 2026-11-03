-- Icône de profil : graine texte (a-z0-9), l'icône est dessinée par le site à partir d'elle
-- Valeur au hasard pour chaque joueur existant et chaque nouveau compte, qu'il peut changer ensuite
alter table users
    add column avatar varchar(32) not null default substr(md5(random()::text), 1, 12);
