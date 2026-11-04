-- Ce que les autres joueurs voient sur la page d'un joueur (/joueur/:pseudo).
-- Le pseudo, l'icône et le niveau restent toujours visibles ; le joueur lui-même voit toujours tout.
alter table users
    -- chiffres clés (classement, victoires, crédits, défis), stats par jeu, XP et date d'inscription
    add column show_stats   boolean not null default true,
    -- dernières victoires
    add column show_history boolean not null default true;
