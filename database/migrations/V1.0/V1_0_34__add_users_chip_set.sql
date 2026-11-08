-- Jeu de jetons choisi dans la boutique (ex. chips:premium) ; null : les jetons classiques
alter table users
    add column chip_set varchar(60);
