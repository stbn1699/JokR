// Construit l'image Docker pour le NAS et l'exporte dans jokr-<version>.tar (version lue dans package.json),
// pour l'importer à la main. Pour l'envoyer directement au NAS par SSH : pnpm deploy:nas.
import {buildImage, docker, tags, version} from "./docker-build.mjs";

const file = `jokr-${version}.tar`;
buildImage();
docker("save", ...tags, "-o", file);
console.log(`\nImage jokr:${version} exportée dans ${file}`);
