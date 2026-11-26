/*
 * Questions du Quizz tirées de Wikidata (données sous licence CC0, domaine public) :
 *   node scripts/build-quizz-wikidata.mjs <thème>…
 * Écrit database/quizz-wikidata/<thème>.sql : l'insertion de ses questions dans quizz_questions (questions du site,
 * validées), numérotées à partir de 1001 pour ne jamais croiser les questions écrites à la main du même thème (1 à
 * 999). Ce fichier se recopie dans une nouvelle migration (database/migrations) pour arriver en base au déploiement.
 * Les questions déjà en base ne sont pas touchées (même thème, même numéro : ignorée) : les données de Wikidata
 * bougent, ne relancer que pour un nouveau thème.
 * Les mauvaises réponses sont tirées parmi les autres réponses de la même liste, au hasard mais toujours les mêmes
 * d'une fois sur l'autre (graine = la question).
 */
import {mkdirSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../database/quizz-wikidata");
const ENDPOINT = "https://query.wikidata.org/sparql";

async function sparql(query) {
    const res = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, {
        headers: {"User-Agent": "quiz-question-generator/1.0", Accept: "application/sparql-results+json"},
    });
    if (!res.ok) throw new Error(`Wikidata : ${res.status} ${await res.text()}`);
    const json = await res.json();
    return json.results.bindings.map(b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
}

const qid = url => url.replace(/^.*\//, "");
// libellé manquant en français : Wikidata renvoie l'identifiant (Q123)
const hasLabel = s => s && !/^Q[0-9]+$/.test(s);

// Hasard reproductible : même graine, mêmes tirages
function seeded(seed) {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
}

// 3 mauvaises réponses différentes de la bonne, prises d'abord dans `near` (même continent…), sinon dans `pool`
function wrongAnswers(seed, correct, pool, near = []) {
    const rand = seeded(seed);
    const picked = [];
    const lower = new Set([correct.toLowerCase()]);
    for (const list of [near, pool]) {
        const candidates = [...new Set(list)].filter(a => !lower.has(a.toLowerCase()));
        while (picked.length < 3 && candidates.length) {
            const a = candidates.splice(Math.floor(rand() * candidates.length), 1)[0];
            if (lower.has(a.toLowerCase())) continue;
            lower.add(a.toLowerCase());
            picked.push(a);
        }
    }
    return picked.length === 3 ? picked : null;
}

const fits = (q, answers) => q.length <= 200 && answers.every(a => a.length <= 80 && a.length > 0);

function write(topic, questions) {
    mkdirSync(OUT, {recursive: true});
    const seen = new Set();
    const rows = [];
    for (const [question, ...answers] of questions) {
        if (!answers.every(Boolean) || !fits(question, answers) || seen.has(question)) continue;
        seen.add(question);
        rows.push([1001 + rows.length, question, ...answers]);
    }
    const lit = v => typeof v === "number" ? String(v) : `'${v.replaceAll("'", "''")}'`;
    const values = rows.map(([n, question, ...answers]) =>
        `    (${lit(topic)}, ${n}, ${lit(question)}, array[${answers.map(lit).join(", ")}])`).join(",\n");
    writeFileSync(join(OUT, `${topic}.sql`),
        "-- Généré par scripts/build-quizz-wikidata.mjs (données Wikidata, CC0)\n" +
        "insert into quizz_questions (topic_id, number, question, answers, status)\n" +
        `select topic_id, number, question, answers, 'approved'\nfrom (values\n${values}\n) as q (topic_id, number, question, answers)\n` +
        "on conflict (topic_id, number) where number is not null do nothing;\n");
    console.log(`${topic} : ${rows.length} questions`);
}

const byKey = (a, b) => a.key.localeCompare(b.key, "en", {numeric: true});

// --- Capitales et continents des pays du monde ---
async function capitales() {
    const data = await sparql(`
        SELECT ?c ?cLabel ?cap ?capLabel (GROUP_CONCAT(DISTINCT ?contLabel; separator="|") AS ?conts)
               (COUNT(DISTINCT ?cap2) AS ?caps) WHERE {
          ?c wdt:P31 wd:Q3624078; wdt:P36 ?cap; wdt:P36 ?cap2.
          FILTER NOT EXISTS { ?c wdt:P576 ?end }
          OPTIONAL { ?c wdt:P30 ?cont. ?cont rdfs:label ?contLabel. FILTER(LANG(?contLabel) = "fr") }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
        } GROUP BY ?c ?cLabel ?cap ?capLabel`);
    const countries = data.filter(r => r.caps === "1" && hasLabel(r.cLabel) && hasLabel(r.capLabel))
        .map(r => ({key: qid(r.c), name: r.cLabel.charAt(0).toUpperCase() + r.cLabel.slice(1), capital: r.capLabel, continents: r.conts ? r.conts.split("|") : []}))
        .sort(byKey);
    const unique = new Map(countries.map(c => [c.key, c]));
    const list = [...unique.values()];
    const continentOf = c => (c.continents.length === 1 ? c.continents[0] : null);
    const CONTINENTS = ["Afrique", "Asie", "Europe", "Amérique du Nord", "Amérique du Sud", "Océanie"];
    const questions = [];
    for (const c of list) {
        const cont = continentOf(c);
        const near = list.filter(o => o !== c && cont && continentOf(o) === cont);
        const caps = wrongAnswers(`cap:${c.key}`, c.capital, list.map(o => o.capital), near.map(o => o.capital));
        if (caps) questions.push([`Quelle est la capitale de ce pays : ${c.name} ?`, c.capital, ...caps]);
        const names = wrongAnswers(`pays:${c.key}`, c.name, list.map(o => o.name), near.map(o => o.name));
        if (names) questions.push([`${c.capital} est la capitale de quel pays ?`, c.name, ...names]);
        if (cont && CONTINENTS.includes(cont)) {
            const others = wrongAnswers(`cont:${c.key}`, cont, CONTINENTS);
            if (others) questions.push([`Sur quel continent se trouve ce pays : ${c.name} ?`, cont, ...others]);
        }
    }
    write("capitales", questions);
}

// --- Départements français : préfectures et numéros ---
async function geographieFrance() {
    const data = await sparql(`
        SELECT ?d ?dLabel ?code ?prefLabel ?regLabel WHERE {
          ?d wdt:P31 wd:Q6465; wdt:P2586 ?code; wdt:P36 ?pref.
          FILTER NOT EXISTS { ?d wdt:P576 ?end }
          OPTIONAL { ?d wdt:P131 ?reg. ?reg wdt:P31 wd:Q36784. FILTER NOT EXISTS { ?reg wdt:P576 ?regEnd } }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
        }`);
    const map = new Map();
    for (const r of data) {
        if (!hasLabel(r.dLabel) || !hasLabel(r.prefLabel) || map.has(r.code)) continue;
        map.set(r.code, {key: r.code, name: r.dLabel.replace(/^département (de la |du |des |de l'|d'|de )?/i, ""),
            prefecture: r.prefLabel, region: hasLabel(r.regLabel) ? r.regLabel : null});
    }
    const list = [...map.values()].sort(byKey);
    const questions = [];
    for (const d of list) {
        const near = list.filter(o => o !== d && d.region && o.region === d.region);
        const prefs = wrongAnswers(`pref:${d.key}`, d.prefecture, list.map(o => o.prefecture), near.map(o => o.prefecture));
        if (prefs) questions.push([`Quelle est la préfecture de ce département : ${d.name} ?`, d.prefecture, ...prefs]);
        const deps = wrongAnswers(`num:${d.key}`, d.name, list.map(o => o.name), near.map(o => o.name));
        if (deps) questions.push([`Quel département porte le numéro ${d.key} ?`, d.name, ...deps]);
        const ofPref = wrongAnswers(`dep:${d.key}`, d.name, list.map(o => o.name), near.map(o => o.name));
        if (ofPref && d.prefecture !== d.name) questions.push([`${d.prefecture} est la préfecture de quel département ?`, d.name, ...ofPref]);
        if (d.region) {
            const regions = wrongAnswers(`reg:${d.key}`, d.region, list.map(o => o.region).filter(Boolean));
            if (regions) questions.push([`Dans quelle région se trouve ce département : ${d.name} ?`, d.region, ...regions]);
        }
    }
    write("geographie-france", questions);
}

// --- Éléments chimiques : symboles et numéros atomiques ---
async function chimie() {
    const data = await sparql(`
        SELECT ?e ?eLabel ?sym ?num WHERE {
          ?e wdt:P31 wd:Q11344; wdt:P246 ?sym; wdt:P1086 ?num.
          SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
        }`);
    const map = new Map();
    for (const r of data) {
        const n = Number(r.num);
        if (!hasLabel(r.eLabel) || n < 1 || n > 118 || map.has(n)) continue;
        map.set(n, {key: String(n), n, name: r.eLabel.charAt(0).toUpperCase() + r.eLabel.slice(1), sym: r.sym});
    }
    const list = [...map.values()].sort((a, b) => a.n - b.n);
    const questions = [];
    for (const e of list) {
        const near = list.filter(o => o !== e && Math.abs(o.n - e.n) <= 12);
        const nameSameLetter = list.filter(o => o !== e && o.sym[0] === e.sym[0]);
        const names = wrongAnswers(`sym:${e.key}`, e.name, list.map(o => o.name), nameSameLetter.map(o => o.name));
        if (names) questions.push([`Quel élément chimique a pour symbole ${e.sym} ?`, e.name, ...names]);
        const syms = wrongAnswers(`nom:${e.key}`, e.sym, list.map(o => o.sym), list.filter(o => o !== e && o.name[0] === e.name[0]).map(o => o.sym));
        if (syms) questions.push([`Quel est le symbole chimique de cet élément : ${e.name} ?`, e.sym, ...syms]);
        if (e.n <= 56) {
            const nums = wrongAnswers(`num:${e.key}`, String(e.n), near.map(o => String(o.n)));
            if (nums) questions.push([`Quel est le numéro atomique de cet élément : ${e.name} ?`, String(e.n), ...nums]);
        }
    }
    write("chimie", questions);
}

// --- Tableaux célèbres et leurs peintres ---
async function peinture() {
    const data = await sparql(`
        SELECT ?p ?pLabel ?aLabel ?links WHERE {
          VALUES ?museum { wd:Q19675 wd:Q23402 wd:Q188740 wd:Q160112 wd:Q51252 wd:Q160236 wd:Q180788 wd:Q190804
                           wd:Q132783 wd:Q224124 wd:Q95569 wd:Q726557 wd:Q303139 wd:Q239303 wd:Q1132918 wd:Q193375
                           wd:Q221092 wd:Q154568 wd:Q2983474 wd:Q150066 wd:Q214867 wd:Q1471477 }
          ?p wdt:P195 ?museum; wdt:P31 wd:Q3305213; wdt:P170 ?a; wikibase:sitelinks ?links.
          FILTER(?links >= 15)
          FILTER NOT EXISTS { ?p wdt:P170 ?a2. FILTER(?a2 != ?a) }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
        } ORDER BY DESC(?links) LIMIT 400`);
    const list = data.filter(r => hasLabel(r.pLabel) && hasLabel(r.aLabel) && !/inconnu|anonyme/i.test(r.aLabel))
        .map(r => ({key: qid(r.p), title: r.pLabel, painter: r.aLabel})).sort(byKey);
    const painters = [...new Set(list.map(p => p.painter))];
    const questions = [];
    for (const p of list) {
        const wrong = wrongAnswers(`peint:${p.key}`, p.painter, painters);
        if (wrong) questions.push([`Qui a peint ce tableau : ${p.title} ?`, p.painter, ...wrong]);
    }
    write("peinture", questions);
}

// --- Oscar du meilleur film : réalisateurs ---
async function oscars() {
    const data = await sparql(`
        SELECT ?f ?fLabel ?dLabel (COUNT(DISTINCT ?d2) AS ?dirs) WHERE {
          ?f wdt:P166 wd:Q102427; wdt:P57 ?d; wdt:P57 ?d2.
          SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
        } GROUP BY ?f ?fLabel ?dLabel`);
    const list = data.filter(r => r.dirs === "1" && hasLabel(r.fLabel) && hasLabel(r.dLabel))
        .map(r => ({key: qid(r.f), title: r.fLabel, director: r.dLabel})).sort(byKey);
    const directors = [...new Set(list.map(f => f.director))];
    const questions = [];
    for (const f of list) {
        const wrong = wrongAnswers(`real:${f.key}`, f.director, directors);
        if (wrong) questions.push([`Qui a réalisé ce film, Oscar du meilleur film : ${f.title} ?`, f.director, ...wrong]);
    }
    write("oscars", questions);
}

// --- Œuvres de la littérature française et leurs auteurs ---
async function litterature() {
    const data = await sparql(`
        SELECT ?w ?wLabel ?aLabel ?links WHERE {
          ?w wdt:P31/wdt:P279* wd:Q7725634; wdt:P50 ?a; wdt:P407 wd:Q150; wikibase:sitelinks ?links.
          ?a wdt:P27 wd:Q142.
          FILTER(?links >= 20)
          FILTER NOT EXISTS { ?w wdt:P50 ?a2. FILTER(?a2 != ?a) }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
        } ORDER BY DESC(?links) LIMIT 400`);
    const map = new Map();
    for (const r of data) if (hasLabel(r.wLabel) && hasLabel(r.aLabel) && !map.has(r.wLabel))
        map.set(r.wLabel, {key: qid(r.w), title: r.wLabel, author: r.aLabel});
    const list = [...map.values()].sort(byKey);
    const authors = [...new Set(list.map(w => w.author))];
    const questions = [];
    for (const w of list) {
        const wrong = wrongAnswers(`auteur:${w.key}`, w.author, authors);
        if (wrong) questions.push([`Qui a écrit cette œuvre : ${w.title} ?`, w.author, ...wrong]);
    }
    write("litterature-francaise", questions);
}

const only = process.argv.slice(2);
const jobs = {capitales, "geographie-france": geographieFrance, chimie, peinture, oscars, "litterature-francaise": litterature};
for (const [name, job] of Object.entries(jobs)) if (!only.length || only.includes(name)) await job();
