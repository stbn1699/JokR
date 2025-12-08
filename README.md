# JokR

Application React alimentée par Vite. L'accueil affiche la liste des jeux disponibles et permet de rejoindre ou créer des salons.

## Variables d'environnement

Copiez le fichier `.env.example` et complétez les valeurs nécessaires :

```
cp .env.example .env
```

- `VITE_API_URL` : URL de l'API (par défaut `http://localhost:4000/api`).
- `VITE_ADMIN_PASSWORD` : mot de passe exigé pour accéder à l'espace `/admin`.

## Accès admin

La page `/admin` n'affiche pas le header grand public et est protégée par le mot de passe défini dans `VITE_ADMIN_PASSWORD`. Une fois authentifié, elle liste toutes les rooms actuellement en ligne.
