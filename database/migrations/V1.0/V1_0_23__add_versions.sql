-- Version du site à laquelle chaque jeu est apparu : pastille « Nouveau » sur l'accueil pour les joueurs
-- qui ne sont pas venus depuis. Un nouveau jeu doit donner sa version dans sa migration d'ajout.
alter table games
    add column added_in varchar(16) not null default '1.0.0';

update games set added_in = '1.4.0' where code in ('TECTONIC', 'GALAXIES', 'SHIKAKU', 'QUEENS');

-- Dernière version du site vue par le joueur : popup des nouveautés quand une version plus récente sort.
-- null : compte tout neuf (pas de popup, la version actuelle est enregistrée à sa première visite).
-- Les joueurs déjà inscrits ont vu la 1.6.0 (version en ligne quand cette colonne a été ajoutée).
alter table users
    add column last_version varchar(16);

update users set last_version = '1.6.0';
