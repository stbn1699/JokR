-- Référence d'une notification plus longue : le résultat d'un défi entre amis vaut « id du défi:id du joueur » (73 caractères)
alter table notifications
    alter column ref type varchar(100);
