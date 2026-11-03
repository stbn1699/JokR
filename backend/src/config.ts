import "dotenv/config";

/*
 * Configuration lue depuis les variables d'environnement.
 * Le serveur refuse de démarrer si un secret obligatoire manque ou est trop faible.
 */
function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
    return value;
}

const jwtSecret = requireEnv("JWT_SECRET");
if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET doit faire au moins 32 caractères");
}

const saltRounds = Number(process.env.SALTROUNDS ?? 10);
if (!Number.isInteger(saltRounds) || saltRounds < 10 || saltRounds > 15) {
    throw new Error("SALTROUNDS doit être un entier entre 10 et 15");
}

// Préfixe des routes de l'API (ex: "/api" quand le front est servi par le même serveur)
const apiPrefix = (process.env.API_PREFIX ?? "").replace(/\/+$/, "");
if (apiPrefix && !apiPrefix.startsWith("/")) {
    throw new Error("API_PREFIX doit commencer par / (ex: /api)");
}

// Dossier du front compilé à servir (image Docker). Vide = API seule (dev)
const staticDir = process.env.STATIC_DIR || undefined;
if (staticDir && !apiPrefix) {
    throw new Error("API_PREFIX est obligatoire quand STATIC_DIR est défini");
}

// Nombre de proxys devant le serveur (reverse proxy du NAS = 1), pour lire la vraie IP du client
const trustProxy = /^\d+$/.test(process.env.TRUST_PROXY ?? "") ? Number(process.env.TRUST_PROXY) : 0;

// Connexion avec Google / Discord : un fournisseur est activé quand ses deux identifiants sont définis
function oauthCredentials(prefix: string): { clientId: string; clientSecret: string } | undefined {
    const clientId = process.env[`${prefix}_CLIENT_ID`];
    const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
    if (!clientId && !clientSecret) return undefined;
    if (!clientId || !clientSecret) throw new Error(`${prefix}_CLIENT_ID et ${prefix}_CLIENT_SECRET vont ensemble`);
    return {clientId, clientSecret};
}
const oauth = {google: oauthCredentials("GOOGLE"), discord: oauthCredentials("DISCORD")};

// Adresse publique du site : Google et Discord y renvoient le joueur après la connexion
const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
if ((oauth.google || oauth.discord) && !/^https?:\/\/[^/]+$/.test(appUrl)) {
    throw new Error("APP_URL (ex: https://jokr.example.com) est obligatoire avec la connexion Google ou Discord");
}

export const config = {
    port: Number(process.env.PORT ?? 3000),
    // Front servi par le même serveur : pas besoin d'autoriser d'autres origines
    corsOrigin: process.env.CORS_ORIGIN ?? !staticDir,
    jwtSecret,
    jwtExpiresIn: "7d",
    saltRounds,
    apiPrefix,
    staticDir,
    trustProxy,
    // Dossier des migrations SQL à appliquer au démarrage (image Docker). Vide = rien (en dev : pnpm migrate)
    migrationsDir: process.env.MIGRATIONS_DIR || undefined,
    oauth,
    appUrl,
} as const;
