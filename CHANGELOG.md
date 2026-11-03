# Nouveautés

Ce fichier est affiché sur le site (page « Nouveautés »). Pour une nouvelle version : ajouter une section
en haut et mettre le même numéro dans le champ `version` de `package.json`.

## 1.4.0 — 3 novembre 2026

Quatre nouveaux puzzles et connexion avec Google ou Discord.

### Nouveaux puzzles

- **Tectonic** : remplir chaque zone de 1 à sa taille, sans deux chiffres identiques côte à côte (5×5 à 8×8),
  avec notes au crayon
- **Galaxies** : découper la grille en galaxies symétriques autour de leur point (5×5 à 10×10)
- **Shikaku** : découper la grille en rectangles en glissant le doigt ou la souris (5×5 à 15×15)
- **Queens** : placer une dame par ligne, colonne et zone, sans qu'elles se touchent (6×6 à 10×10),
  avec croix automatiques en option
- Comme les autres jeux : XP et crédits, aides selon la difficulté, validation automatique, annuler / rétablir,
  reprise de partie, version téléphone, défi du jour et classement

### Connexion

- Nouvelles pages de connexion et d'inscription
- Connexion et inscription en un clic avec Google ou Discord : il suffit de choisir son pseudo
- Si l'email Google ou Discord est celui d'un compte JokR, on retrouve son compte et sa progression
- Profil : lier ou retirer ses comptes Google et Discord, créer un mot de passe
- Après l'inscription avec email, on est connecté directement
- Bouton pour afficher le mot de passe pendant la saisie

## 1.3.1 — 2 novembre 2026

Corrections et améliorations.

## 1.3.0 — 2 novembre 2026

### UX
- validation des grilles de sudoku, binero et rikudo automatiques lorsque toutes les cases sont remplies

### UI
- ajout des règles du sudoku dans le panneau droite
- transformation du point vert dans le sélecteur de jours du défi du jour en un point doré si toutes les grilles sont validées


## 1.2.0 — 2 novembre 2026

Crédits, défis du jour revus, nouvelle progression et version mobile repensée.

### Crédits

- Chaque puzzle fini rapporte de 1 à 3 crédits selon la difficulté choisie
- Les crédits s'affichent à côté de l'XP, avant de jouer, dans la popup de victoire et sur le profil
- Ils serviront bientôt à miser sur les jeux de hasard

### Défi du jour

- XP et crédits doublés pour la réussite qui compte au classement
- Nouvel onglet « Daily » : tous les défis, mois par mois et jour par jour, aujourd'hui compris
- Sélecteur de mois et bandeau des jours à faire glisser, avec un point vert sur les jours réussis
- Bouton « Défi du jour » sous chaque jeu de l'accueil
- Les défis sont réservés aux joueurs inscrits

### Progression

- Nouvelle courbe d'XP : les premiers niveaux arrivent vite, le niveau 100 demande environ 9 mois de jeu régulier
- Chaque joueur garde son niveau
- Nouvelles icônes de niveau, jusqu'au niveau 50

### Classements

- Onglet « Classement » dans le haut de la page
- Page plus large, podium avec médailles pour les trois premiers
- Défi du jour : choix de la date comme sur la page des défis

### Sur téléphone

- Les parties tiennent dans l'écran, sans défilement : grille à la taille de l'écran, barre d'outils au-dessus, pavé compact en dessous
- Rikudo : bande de nombres à faire glisser, qui se place toute seule sur les nombres utiles
- Accueil, défis, classements, profil et connexion plus compacts

## 1.1.0 — 1er novembre 2026

Deux catégories de jeux.

### Navigation

- Onglets « Puzzle » et « Hasard » dans le haut de la page
- Puzzle : Sudoku, Binero et Rikudo, comme avant
- Hasard : nouvelle catégorie, les premiers jeux (roulette, poker, blackjack, machine à sous…) arrivent bientôt

### Améliorations

- Bouton « Retour » sur la page Nouveautés

## 1.0.0 — 1er novembre 2026

Première version de JokR.

### Jeux

- Sudoku 9×9 : de 20 à 55 cases à remplir, notes au crayon, surlignage de la ligne, de la colonne et du bloc
- Binero (0 et 1) : grilles de 6×6 à 12×12
- Rikudo : plateau en nid d'abeille de 36, 60 ou 90 cases, avec le chemin des nombres tracé en rouge

### Dans chaque jeu

- Choix de la taille et du nombre de cases à remplir, avec l'XP gagnée affichée avant de jouer
- Grilles toujours à solution unique
- Chrono et record personnel
- Annuler et rétablir (Ctrl+Z, Ctrl+Y)
- Option « Montrer les erreurs »
- Reprise de la partie en cours après un rafraîchissement de la page
- Jouable à la souris, au clavier et sur téléphone

### Défi du jour

- Une grille de Sudoku, de Binero et de Rikudo par jour, la même pour tout le monde
- Nouvelles grilles chaque jour à minuit
- Classement au temps, une seule réussite comptée par jour
- Historique des défis des 30 derniers jours, à rejouer hors classement
- Réservé aux joueurs inscrits

### Comptes et progression

- XP et niveaux, au global et par jeu
- Classements : XP globale, par jeu et défi du jour
- Profil : statistiques, historique des parties, changement de mot de passe et suppression du compte
