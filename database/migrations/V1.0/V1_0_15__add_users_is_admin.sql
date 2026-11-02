-- Comptes administrateurs (page Statistiques) : à changer directement en base, effet immédiat
--   update users set is_admin = true  where username = '...';
--   update users set is_admin = false where username = '...';
alter table users
    add column is_admin boolean not null default false;

-- Reprend l'administrateur défini jusqu'ici dans ADMIN_USERNAMES
update users
set is_admin = true
where username = 'stbn169';
