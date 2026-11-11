/*
 * Service worker de JokR : uniquement la page « Mise à jour en cours » (public/offline.html).
 * Rien d'autre n'est mis en cache : le site vient toujours du serveur.
 *
 * Quand le serveur ne répond pas pendant une mise à jour, le navigateur montre cette page au lieu d'une erreur :
 * - le serveur est injoignable (conteneur arrêté)
 * - ou c'est le NAS qui répond à sa place (page « service indisponible » de Synology pendant le démarrage) :
 *   une page du site porte la balise <meta name="jokr-app">, une autre page HTML vient donc d'ailleurs.
 * Marche pour les joueurs déjà venus une fois sur le site (le service worker s'installe à la première visite).
 */

// Changer le numéro quand offline.html change : le navigateur remplace alors la copie gardée
const CACHE = "jokr-offline-v3";
const OFFLINE = "/offline.html";
const ASSETS = [OFFLINE, "/JokR_Logo_Full_Outline.png", "/JosefinSlab.woff2", "/favicon.svg"];

self.addEventListener("install", event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
    event.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

const offline = () => caches.match(OFFLINE);

// Page du site (et pas la page d'erreur du NAS)
async function isJokrPage(res) {
    if (!(res.headers.get("content-type") ?? "").includes("text/html")) return true;
    const html = await res.clone().text();
    return html.includes('name="jokr-app"');
}

self.addEventListener("fetch", event => {
    const {request} = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    // ressources de la page hors ligne : depuis le cache si le serveur est coupé
    if (url.origin === self.location.origin && ASSETS.includes(url.pathname) && url.pathname !== OFFLINE) {
        event.respondWith(fetch(request).catch(() => caches.match(url.pathname)));
        return;
    }

    if (request.mode !== "navigate") return;
    event.respondWith((async () => {
        try {
            const res = await fetch(request);
            if (res.status >= 500 || (res.ok && !(await isJokrPage(res)))) return (await offline()) ?? res;
            return res;
        } catch {
            return (await offline()) ?? Response.error();
        }
    })());
});
