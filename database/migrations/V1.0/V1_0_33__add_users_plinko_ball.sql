-- Bille de Plinko choisie dans la boutique (ex. ball:rainbow/1_red) ; null : la bille par défaut
alter table users
    add column plinko_ball varchar(60);
