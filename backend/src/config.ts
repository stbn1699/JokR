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

export const config = {
    port: Number(process.env.PORT ?? 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? true,
    jwtSecret,
    jwtExpiresIn: "7d",
    saltRounds,
} as const;
