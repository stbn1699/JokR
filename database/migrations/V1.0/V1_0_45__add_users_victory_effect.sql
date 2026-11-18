-- Effet de victoire choisi dans la boutique (joué en fin de grille, ex. victory-artifice) ; null : les confettis
alter table users
    add column victory_effect varchar(40);
