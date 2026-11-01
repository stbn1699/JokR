# JokR

Plateforme de mini-jeux avec comptes joueurs et progression (niveaux et XP, globaux et par jeu).
Jeux disponibles :

- **Sudoku** : grille 9×9, de 20 à 55 cases à remplir.
- **Binero** (Takuzu) : grille de 0 et de 1, en 6×6, 8×8, 10×10 ou 12×12. Jamais trois chiffres identiques
  côte à côte, autant de 0 que de 1 par ligne et par colonne, pas deux lignes (ou colonnes) identiques.

Avant chaque partie, une popup permet de choisir les paramètres (taille, nombre de cases à remplir)
et affiche l'XP gagnée à la résolution.

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
| `backend/` | `pnpm dev`       | API avec rechargement automatique       |
| `backend/` | `pnpm typecheck` | vérification des types de l'API         |
| `backend/` | `pnpm test`      | tests de l'API (Vitest)                 |
| `backend/` | `pnpm build`     | compile l'API dans `backend/dist/`      |
| `backend/` | `pnpm start`     | lance l'API compilée                    |

La CI GitHub Actions (`.github/workflows/ci.yml`) lance lint, typecheck, tests et builds à chaque push sur `main`
et sur chaque pull request.

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
| GET     | `/users/:userId`           | –         | profil public (sans email)                |
| GET     | `/gameStats/user/:userId`  | –         | stats par jeu d'un joueur                 |
| GET     | `/sudoku/settings`         | –         | plage de cases à remplir et XP proposées  |
| POST    | `/sudoku/generateSudoku`   | –         | nouvelle grille → `{ gameId, grid }`      |
| POST    | `/sudoku/validateSudoku`   | optionnel | valide `{ gameId, grid }`, XP si connecté |
| GET     | `/binero/settings`         | –         | tailles, plages et XP proposées           |
| POST    | `/binero/generate`         | –         | `{ size, emptyCells }` → `{ gameId, grid }` |
| POST    | `/binero/validate`         | optionnel | valide `{ gameId, grid }`, XP si connecté |
