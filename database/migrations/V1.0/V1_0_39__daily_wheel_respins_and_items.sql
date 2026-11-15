-- Roue du jour : une case « relance » donne un lancer de plus le même jour (attempt : 1er, 2e… lancer du jour),
-- une case « cadeau » donne une bille de Plinko de la boutique (item_id : la bille offerte, null sinon).
alter table daily_wheel_spins
    add column attempt smallint not null default 1,
    add column item_id varchar(128);

alter table daily_wheel_spins
    drop constraint daily_wheel_spins_pkey,
    add primary key (user_id, spin_date, attempt);
