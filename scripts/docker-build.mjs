// Construction de l'image Docker de JokR, partagée par docker-image.mjs (export .tar) et deploy-nas.mjs (envoi au NAS).
// L'image porte deux tags : jokr:<version>, pour savoir quelle version tourne, et jokr:latest, celui du docker-compose.yml.
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";

export const {version} = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
export const tags = [`jokr:${version}`, "jokr:latest"];

export const docker = (...args) => execFileSync("docker", args, {stdio: "inherit"});

/** Vérifie que Docker Desktop répond, sinon arrête le script avec un message clair. */
export function requireDocker() {
    try {
        execFileSync("docker", ["info"], {stdio: "ignore"});
    } catch {
        console.error("Docker ne répond pas : lance Docker Desktop, attends qu'il soit prêt, puis relance la commande.");
        process.exit(1);
    }
}

/** Construit l'image pour les NAS Intel/AMD (pour un modèle ARM : linux/arm64). */
export function buildImage() {
    requireDocker();
    docker("build", "--platform", "linux/amd64", ...tags.flatMap(t => ["-t", t]), ".");
}
