// Construit l'image Docker pour le NAS et l'exporte dans jokr-<version>.tar (version lue dans package.json).
// L'image porte deux tags : jokr:<version>, pour voir dans Container Manager quelle version tourne, et jokr:latest,
// celui qu'utilise deploy/docker-compose.yml.
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";

const {version} = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const file = `jokr-${version}.tar`;
const docker = (...args) => execFileSync("docker", args, {stdio: "inherit"});

docker("build", "--platform", "linux/amd64", "-t", `jokr:${version}`, "-t", "jokr:latest", ".");
docker("save", `jokr:${version}`, "jokr:latest", "-o", file);
console.log(`\nImage jokr:${version} exportée dans ${file}`);
