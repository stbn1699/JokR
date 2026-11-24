-- Pronoms affichés sur la page du joueur (/joueur/:pseudo et son onglet Profil), sous le pseudo.
-- Texte libre : choisis dans la liste du site ou écrits par le joueur ; null = rien d'affiché.
alter table users
    add column pronouns varchar(50);
