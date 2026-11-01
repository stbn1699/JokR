# JokR

Plateforme de mini-jeux avec comptes joueurs et progression (niveaux et XP, globaux et par jeu).
Jeux disponibles :

- **Sudoku** : grille 9×9, de 20 à 55 cases à remplir.
- **Binero** (Takuzu) : grille de 0 et de 1, en 6×6, 8×8, 10×10 ou 12×12. Jamais trois chiffres identiques
  côte à côte, autant de 0 que de 1 par ligne et par colonne, pas deux lignes (ou colonnes) identiques.
- **Rikudo** : plateau en nid d'abeille de 36, 60 ou 90 cases autour d'une case centrale vide. Placer les nombres
  de 1 à N pour que deux nombres consécutifs soient voisins ; un point entre deux cases impose que leurs nombres
  se suivent. 1 et N sont toujours donnés.

Avant chaque partie, une popup permet de choisir les paramètres (taille, nombre de cases à remplir)
et affiche l'XP gagnée à la résolution.

En jeu :

- **Chrono** pendant la partie ; le temps officiel est mesuré par le serveur. Badge « Nouveau record »
  quand c'est le meilleur temps du joueur sur la même configuration.
- **Annuler / Rétablir** (boutons ou Ctrl+Z / Ctrl+Y).
- **Montrer les erreurs** (option) : les cases qui contredisent déjà les règles passent en rouge.
- **Notes au crayon** au Sudoku (bouton ✏ ou touche N).
- **Reprise** d'une partie après un rafraîchissement de la page (tant que le serveur la garde en mémoire).
- Jouable à la souris et au doigt (panneau des chiffres), mise en page adaptée aux téléphones.

Autour des jeux :

- **Défi du jour** : une grille Sudoku (9×9, 45 cases), une Binero (10×10, 50 cases) et un Rikudo (60 cases,
  40 à remplir) par jour, les mêmes pour tout le monde, avec un classement au temps. Une seule réussite comptée
  par jour (XP et classement). Le jour change à minuit, heure de Paris : le serveur génère alors les grilles du
  nouveau jour (et au démarrage si elles manquent), et les pages ouvertes se mettent à jour d'elles-mêmes
  quelques secondes après minuit. Les défis des jours précédents se rejouent depuis `/defi` :
  ils comptent alors comme une partie normale (XP habituelle) et n'entrent pas dans le classement de leur jour.
- **Classements** : XP globale, niveau par jeu, et défi du jour (page `/classements`).
- **Profil** : stats par jeu, historique des parties, changement de mot de passe, suppression du compte.

## Stack

| Partie   | Techno                                              | Dossier      |
|----------|-----------------------------------------------------|--------------|
| Front    | React 19, Vite, TypeScript, Sass, React Router      | `src/`       |
| API      | Node, Express 5, TypeScript, Kysely, JWT, bcrypt    | `backend/`   |
| Base     | PostgreSQL, migrations Flyway                       | `database/`  |

## Prérequis

- Node 20 ou plus
- [pnpm](https://pnpm.io/installation) 10 : le front et l'API forment un workspace pnpm, avec un seul lockfile
- PostgreSQL
- [Flyway CLI](https://documentation.red-gate.com/fd/command-line-184127404.html) pour les migrations

## Installation

À la racine, une seule commande installe les dépendances du front et de l'API :

```bash
pnpm install
```

### 1. Base de données

Créer une base `jokr`, puis appliquer les migrations. Le mot de passe Postgres se passe par variable d'environnement
(il ne doit pas être écrit dans `database/flyway.conf`, qui est versionné) :

```bash
FLYWAY_PASSWORD=<mot de passe postgres> pnpm migrate
```

### 2. API

```bash
cd backend
cp .env.example .env   # puis remplir les valeurs (voir le fichier)
pnpm dev               # http://localhost:3000
```

Le serveur refuse de démarrer si `JWT_SECRET` manque ou fait moins de 32 caractères.
La commande pour en générer un est dans `backend/.env.example`.

### 3. Front

```bash
cp .env.example .env   # VITE_API_URL=http://localhost:3000
pnpm dev               # http://localhost:5173
```

## Scripts

| Où         | Commande         | Effet                                   |
|------------|------------------|-----------------------------------------|
| racine     | `pnpm dev`       | front en mode dev                       |
| racine     | `pnpm build`     | typecheck + build du front dans `dist/` |
| racine     | `pnpm lint`      | ESLint sur tout le projet               |
| racine     | `pnpm test`      | tests du front (Vitest)                 |
| racine     | `pnpm test:all`  | tests du front et de l'API              |
| racine     | `pnpm migrate`   | migrations Flyway                       |
| racine     | `pnpm docker:image` | image Docker exportée dans `jokr-image.tar` |
| `backend/` | `pnpm dev`       | API avec rechargement automatique       |
| `backend/` | `pnpm typecheck` | vérification des types de l'API         |
| `backend/` | `pnpm test`      | tests de l'API (Vitest)                 |
| `backend/` | `pnpm build`     | compile l'API dans `backend/dist/`      |
| `backend/` | `pnpm start`     | lance l'API compilée                    |

La CI GitHub Actions (`.github/workflows/ci.yml`) lance lint, typecheck, tests et builds à chaque push sur `main`
et sur chaque pull request.

## Déploiement (Docker sur un NAS Synology)

L'image `jokr` contient le front compilé et l'API : un seul conteneur, un seul port, l'API sous `/api`.
Au démarrage, elle applique d'elle-même les migrations manquantes de `database/migrations`
(compatible Flyway : même table `flyway_schema_history`, mêmes checksums), puis lance le site.
Le dossier [`deploy/`](deploy) contient le projet à installer sur le NAS : l'application et sa base Postgres.

### Construire l'image (sur le PC)

Docker Desktop doit être lancé.

```bash
pnpm docker:image
```

Cela produit `jokr-image.tar` (~135 Mo) à la racine du projet. L'image est construite pour les NAS Intel/AMD
(`linux/amd64`, la grande majorité des Synology). Pour un modèle ARM, remplacer par `linux/arm64` dans le script.

### Première installation

1. **Dossier** : dans File Station, créer un dossier (ex : `docker/jokr`) et y déposer
   `deploy/docker-compose.yml` ainsi qu'un fichier `.env` copié depuis `deploy/.env.example`
   et rempli (mot de passe Postgres, `JWT_SECRET`, port).
2. **Image** : Container Manager → Image → Ajouter → Ajouter à partir d'un fichier → `jokr-image.tar`.
3. **Projet** : Container Manager → Projet → Créer, nom `jokr`, chemin = le dossier de l'étape 1,
   source « Utiliser le docker-compose.yml existant ». Valider : la base et le site démarrent.
   Le site répond sur `http://ip-du-nas:8080`.
4. **HTTPS (recommandé)** : Panneau de configuration → Portail de connexion → Avancé → Proxy inversé.
   Source `https://jokr.ton-domaine:443`, destination `http://localhost:8080`.
   Garder `TRUST_PROXY=1` dans `.env` dans ce cas (sinon `0`).

Les données de la base sont dans le sous-dossier `data/postgres` du projet.

### Mettre à jour

1. Sur le PC : `pnpm docker:image`.
2. Container Manager → Image → Ajouter → Ajouter à partir d'un fichier → le nouveau `jokr-image.tar`
   (il remplace `jokr:latest`).
3. Container Manager → Projet → `jokr` → Arrêter, puis Créer (Build) : le conteneur est recréé avec la
   nouvelle image et les nouvelles migrations sont appliquées au démarrage. Les comptes et l'XP sont conservés ;
   seules les parties en cours (gardées en mémoire) sont perdues.
4. Optionnel : Image → supprimer l'ancienne image devenue inutilisée.

### Sauvegarde

Le plus sûr est un export SQL de la base, par exemple en SSH depuis le dossier du projet :

```bash
docker compose exec db pg_dump -U jokr jokr > jokr-backup.sql
```

### Variables de l'image

Celles de `backend/.env.example`, plus quelques-unes déjà réglées dans l'image :

| Variable         | Valeur dans l'image | Rôle                                                   |
|------------------|---------------------|--------------------------------------------------------|
| `API_PREFIX`     | `/api`              | préfixe des routes de l'API (vide en dev)              |
| `STATIC_DIR`     | `/app/public`       | front compilé servi par le serveur                     |
| `MIGRATIONS_DIR` | `/app/migrations`   | migrations appliquées au démarrage                     |
| `TRUST_PROXY`    | (compose : `1`)     | nombre de proxys devant le serveur, pour la vraie IP    |

## Fonctionnement

- **Comptes** : le mot de passe est haché en SHA-256 dans le navigateur, puis avec bcrypt côté serveur.
  La connexion renvoie un JWT (valable 7 jours), envoyé ensuite dans l'en-tête `Authorization: Bearer …`.
- **XP** : elle est toujours calculée et attribuée par le serveur. Le serveur garde chaque grille générée
  (`gameId`) et n'accepte qu'une solution de cette grille, une seule fois.
- **Grilles** : générées par le serveur, toujours à solution unique (résolvables par déduction, sans hasard).
  Les plages de difficulté proposées sont celles que le générateur atteint exactement en moins de 100 ms.
- **Niveaux** : passer du niveau `n` au suivant demande `ceil(120 × n^1.4)` XP.
  La formule est dans `backend/src/utils/leveling.ts` et `src/Services/leveling.ts`.

## API

| Méthode | Route                      | Auth      | Rôle                                      |
|---------|----------------------------|-----------|-------------------------------------------|
| GET     | `/ping`                    | –         | healthcheck                               |
| GET     | `/games/list`              | –         | liste des jeux                            |
| GET     | `/games/getBaseXp/:code`   | –         | XP de base d'un jeu                       |
| POST    | `/users/register`          | –         | inscription (limitée à 5/h par IP)        |
| POST    | `/users/login`             | –         | connexion (limitée à 10/15 min par IP)    |
| GET     | `/users/me`                | requise   | profil du joueur connecté                 |
| GET     | `/users/me/results`        | requise   | ses parties gagnées (`?limit=&offset=`)   |
| PUT     | `/users/me/password`       | requise   | change son mot de passe                   |
| DELETE  | `/users/me`                | requise   | supprime son compte (mot de passe requis) |
| GET     | `/users/:userId`           | –         | profil public (sans email)                |
| GET     | `/gameStats/user/:userId`  | –         | stats par jeu d'un joueur                 |
| GET     | `/sudoku/settings`         | –         | plage de cases à remplir et XP proposées  |
| POST    | `/sudoku/generateSudoku`   | –         | nouvelle grille → `{ gameId, grid }`      |
| GET     | `/sudoku/games/:gameId`    | –         | partie en cours (pour la reprendre)       |
| POST    | `/sudoku/validateSudoku`   | optionnel | valide `{ gameId, grid }`, XP si connecté |
| GET     | `/binero/settings`         | –         | tailles, plages et XP proposées           |
| POST    | `/binero/generate`         | –         | `{ size, emptyCells }` → `{ gameId, grid }` |
| GET     | `/binero/games/:gameId`    | –         | partie en cours (pour la reprendre)       |
| POST    | `/binero/validate`         | optionnel | valide `{ gameId, grid }`, XP si connecté |
| GET     | `/rikudo/settings`         | –         | tailles, plages et XP proposées           |
| POST    | `/rikudo/generate`         | –         | `{ size, emptyCells }` → `{ gameId, puzzle: { radius, cells, links } }` |
| GET     | `/rikudo/games/:gameId`    | –         | partie en cours (pour la reprendre)       |
| POST    | `/rikudo/validate`         | optionnel | valide `{ gameId, values }`, XP si connecté |
| GET     | `/daily`                   | optionnel | défis du jour (et résultats du joueur)    |
| POST    | `/daily/:game/start`       | optionnel | commence le défi du jour                  |
| GET     | `/daily/history`           | optionnel | défis des 30 jours précédents             |
| POST    | `/daily/:game/replay/:date`| –         | rejoue un défi passé (partie normale)     |
| GET     | `/daily/:game/leaderboard` | optionnel | meilleurs temps du jour (`?date=` passée) |
| GET     | `/leaderboard/xp`          | optionnel | classement par XP globale                 |
| GET     | `/leaderboard/games/:game` | optionnel | classement d'un jeu                       |
