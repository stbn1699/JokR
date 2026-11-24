// Déploie la version de package.json sur le NAS, par SSH, sans passer par Container Manager :
//   1. construit l'image (comme pnpm docker:image, sans fichier .tar) ;
//   2. l'envoie au NAS, compressée, directement dans le Docker du NAS ;
//   3. demande de confirmer que le site est fermé pour la mise à jour (Statistiques → En direct) ;
//   4. recrée seulement le conteneur du site (la base continue de tourner), qui applique les migrations au démarrage ;
//   5. attend qu'il soit « healthy », puis supprime les vieilles images (garde la version précédente).
//
// Réglages dans deploy/nas.json (voir deploy/nas.example.json et la section Déploiement du README).
//
//   pnpm deploy:nas                     tout, avec confirmation avant le redémarrage
//   pnpm deploy:nas --yes               sans confirmation
//   pnpm deploy:nas --skip-build        renvoie l'image déjà construite sur le PC
//   pnpm deploy:nas --rollback 4.0.1    remet une version encore présente sur le NAS
import {execFileSync, spawn, spawnSync} from "node:child_process";
import {existsSync, readFileSync} from "node:fs";
import {createInterface} from "node:readline/promises";
import {createGzip} from "node:zlib";
import {buildImage, requireDocker, tags, version} from "./docker-build.mjs";

const configFile = new URL("../deploy/nas.json", import.meta.url);
if (!existsSync(configFile)) {
    fail("deploy/nas.json introuvable : copie deploy/nas.example.json en deploy/nas.json et remplis-le.");
}
const config = {
    project: "jokr",
    service: "app",
    docker: "/usr/local/bin/docker",
    ...JSON.parse(readFileSync(configFile, "utf8")),
};
if (!config.host || !config.dir) fail("deploy/nas.json : « host » et « dir » sont obligatoires.");

const args = process.argv.slice(2);
const yes = args.includes("--yes");
const skipBuild = args.includes("--skip-build");
const rollbackIndex = args.indexOf("--rollback");
const rollback = rollbackIndex >= 0 ? args[rollbackIndex + 1] : null;
if (rollbackIndex >= 0 && !/^\d+\.\d+\.\d+$/.test(rollback ?? "")) fail("Usage : pnpm deploy:nas --rollback 4.0.1");

const D = `sudo -n ${config.docker}`;
let compose = `${D} compose`;

function fail(message) {
    console.error(`\n✖ ${message}`);
    process.exit(1);
}

function step(message) {
    console.log(`\n▶ ${message}`);
}

/** Lance une commande sur le NAS. Sans `capture`, la sortie s'affiche ; avec, elle est renvoyée. */
function ssh(command, {capture = false, check = true} = {}) {
    const result = spawnSync("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10", config.host, command], {
        stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
        encoding: "utf8",
    });
    if (check && result.status !== 0) {
        const detail = capture ? `\n${(result.stderr || result.stdout || "").trim()}` : "";
        fail(`Commande refusée sur le NAS : ${command}${detail}`);
    }
    return {ok: result.status === 0, out: (result.stdout ?? "").trim(), err: (result.stderr ?? "").trim()};
}

/** Vérifie SSH, sudo sans mot de passe pour docker, le dossier du projet, et choisit la commande compose. */
function checkNas() {
    step(`Connexion à ${config.host}`);
    const sshTest = ssh("true", {capture: true, check: false});
    if (!sshTest.ok) {
        fail(`Connexion SSH impossible (${sshTest.err || "pas de réponse"}).\n` +
            "  Vérifie que SSH est activé sur le NAS et que ta clé y est installée (README, section Déploiement).");
    }
    const dockerTest = ssh(`${D} version --format '{{.Server.Version}}'`, {capture: true, check: false});
    if (!dockerTest.ok) {
        fail(`Docker refusé sur le NAS (${dockerTest.err}).\n` +
            `  Il faut autoriser « sudo ${config.docker} » sans mot de passe (README, section Déploiement).`);
    }
    if (!ssh(`${compose} version`, {capture: true, check: false}).ok) {
        const legacy = `sudo -n ${config.docker}-compose`;
        if (!ssh(`${legacy} version`, {capture: true, check: false}).ok) fail("Ni « docker compose » ni « docker-compose » sur le NAS.");
        compose = legacy;
    }
    if (!ssh(`test -f '${config.dir}/docker-compose.yml'`, {capture: true, check: false}).ok) {
        fail(`Pas de docker-compose.yml dans ${config.dir} sur le NAS : vérifie « dir » dans deploy/nas.json.`);
    }
    console.log(`  Docker ${dockerTest.out} sur le NAS, projet ${config.project} dans ${config.dir}`);
}

/** Avertit si le dossier contient des changements non commités : ils partiraient dans l'image. */
async function checkGit() {
    const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {encoding: "utf8"}).trim();
    if (status && !yes && !(await confirm("Des fichiers modifiés ne sont pas commités et seront dans l'image. Continuer ?"))) {
        process.exit(0);
    }
}

async function confirm(question) {
    const rl = createInterface({input: process.stdin, output: process.stdout});
    const answer = await rl.question(`\n? ${question} (o/N) `);
    rl.close();
    return /^(o|oui|y|yes)$/i.test(answer.trim());
}

/** docker save | gzip | ssh « docker load » : l'image arrive dans le Docker du NAS sans fichier intermédiaire. */
function sendImage() {
    step(`Envoi de jokr:${version} au NAS`);
    return new Promise((resolve, reject) => {
        const save = spawn("docker", ["save", ...tags], {stdio: ["ignore", "pipe", "inherit"]});
        const load = spawn("ssh", ["-o", "BatchMode=yes", config.host, `${D} load`], {stdio: ["pipe", "inherit", "inherit"]});
        const gzip = createGzip({level: 1});
        let sent = 0;
        let shown = 0;
        gzip.on("data", chunk => {
            sent += chunk.length;
            if (sent - shown > 10 * 1024 * 1024) {
                shown = sent;
                process.stdout.write(`\r  ${Math.round(sent / 1024 / 1024)} Mo envoyés`);
            }
        });
        save.stdout.pipe(gzip).pipe(load.stdin);
        save.on("exit", code => code !== 0 && reject(new Error(`docker save a échoué (code ${code})`)));
        load.on("exit", code => {
            process.stdout.write("\n");
            return code === 0 ? resolve() : reject(new Error(`docker load a échoué sur le NAS (code ${code})`));
        });
    }).catch(error => fail(error.message));
}

/** Recrée le conteneur du site avec jokr:latest, sans toucher à la base. */
function restartApp() {
    step("Redémarrage du site avec la nouvelle image");
    ssh(`cd '${config.dir}' && ${compose} -p ${config.project} up -d --no-deps ${config.service}`);
}

/** Attend le healthcheck de l'image (GET /api/ping), qui passe une fois les migrations appliquées. */
async function waitHealthy() {
    step("Attente du démarrage (migrations, puis /api/ping)");
    const container = ssh(`cd '${config.dir}' && ${compose} -p ${config.project} ps -q ${config.service}`, {capture: true}).out;
    if (!container) fail("Le conteneur du site n'existe pas après le redémarrage.");
    const deadline = Date.now() + 3 * 60 * 1000;
    let status = "";
    while (Date.now() < deadline) {
        status = ssh(`${D} inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' ${container}`, {capture: true}).out;
        if (status.endsWith("healthy") && !status.endsWith("unhealthy")) return;
        if (status.startsWith("exited") || status.endsWith("unhealthy")) break;
        await new Promise(r => setTimeout(r, 3000));
    }
    console.error(`\n  État : ${status || "inconnu"}. Derniers logs :\n`);
    ssh(`${D} logs --tail 40 ${container}`, {check: false});
    fail("Le site n'a pas démarré correctement. Pour revenir en arrière : pnpm deploy:nas --rollback <version précédente>");
}

/** Supprime les images jokr:<version> sauf la courante et la précédente (pour un retour arrière). */
function cleanImages(current) {
    const listed = ssh(`${D} images jokr --format '{{.Tag}}'`, {capture: true}).out.split("\n");
    const versions = listed.filter(t => /^\d+\.\d+\.\d+$/.test(t))
        .sort((a, b) => b.localeCompare(a, undefined, {numeric: true}));
    const keep = new Set([current, versions.find(v => v !== current && versions.indexOf(v) > versions.indexOf(current))]);
    const old = versions.filter(v => !keep.has(v));
    if (old.length) {
        step(`Nettoyage des anciennes images : ${old.join(", ")}`);
        ssh(`${D} rmi ${old.map(v => `jokr:${v}`).join(" ")}`, {check: false});
    }
    ssh(`${D} image prune -f`, {capture: true, check: false});
}

async function askSiteClosed() {
    if (yes) return;
    console.log("\n  Avant le redémarrage : sur le site, en administrateur, Statistiques → En direct →");
    console.log("  « Fermer le site pour la mise à jour », puis attendre le voyant vert « Plus personne ne joue ».");
    if (!(await confirm("Le site est fermé et plus personne ne joue ?"))) {
        console.log("  Rien n'a été redémarré. L'image est déjà sur le NAS : relance avec --skip-build quand c'est prêt.");
        process.exit(0);
    }
}

// --- Déroulé ---

checkNas();

if (rollback) {
    if (!ssh(`${D} image inspect jokr:${rollback}`, {capture: true, check: false}).ok) {
        fail(`jokr:${rollback} n'est plus sur le NAS.`);
    }
    await askSiteClosed();
    step(`Retour à jokr:${rollback}`);
    ssh(`${D} tag jokr:${rollback} jokr:latest`);
    restartApp();
    await waitHealthy();
    console.log(`\n✔ JokR ${rollback} tourne de nouveau sur le NAS.`);
    process.exit(0);
}

await checkGit();
if (skipBuild) {
    requireDocker();
} else {
    step(`Construction de l'image jokr:${version}`);
    buildImage();
}
await sendImage();
await askSiteClosed();
restartApp();
await waitHealthy();
cleanImages(version);
console.log(`\n✔ JokR ${version} est en ligne sur le NAS.`);
