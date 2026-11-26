/*
 * Quizz : questions proposées par les joueurs, vérification de ce qu'envoie le formulaire.
 * Partagé avec le site (src/Components/Quizz) : mêmes limites des deux côtés.
 */

// Thèmes existants (src/Components/Quizz/topics), id → nom : un test du site vérifie que la liste est à jour
export const QUIZZ_TOPIC_NAMES: Record<string, string> = {
    "cars": "Cars",
    "comedies-francaises": "Comédies françaises",
    "disney": "Disney",
    "films-horreur": "Films d'horreur",
    "james-bond": "James Bond",
    "jurassic-park": "Jurassic Park",
    "seigneur-des-anneaux": "Le Seigneur des Anneaux",
    "marvel": "Marvel",
    "oscars": "Oscars",
    "pirates-des-caraibes": "Pirates des Caraïbes",
    "pixar": "Pixar",
    "retour-vers-le-futur": "Retour vers le futur",
    "star-wars": "Star Wars",
    "tarantino": "Tarantino",
    "arcane": "Arcane",
    "breaking-bad": "Breaking Bad",
    "brooklyn-nine-nine": "Brooklyn Nine-Nine",
    "cyberpunk-edgerunners": "Cyberpunk: Edgerunners",
    "doctor-who": "Doctor Who",
    "friends": "Friends",
    "game-of-thrones": "Game of Thrones",
    "kaamelott": "Kaamelott",
    "casa-de-papel": "La Casa de Papel",
    "simpson": "Les Simpson",
    "stranger-things": "Stranger Things",
    "the-100": "The 100",
    "the-office": "The Office",
    "the-witcher": "The Witcher",
    "assassins-creed": "Assassin's Creed",
    "cyberpunk": "Cyberpunk",
    "souls": "Dark Souls et Elden Ring",
    "final-fantasy": "Final Fantasy",
    "fortnite": "Fortnite",
    "gta": "GTA",
    "league-of-legends": "League of Legends",
    "mario": "Mario",
    "minecraft": "Minecraft",
    "pokemon": "Pokémon",
    "retro-gaming": "Retro gaming",
    "skyrim": "Skyrim",
    "warhammer": "Warhammer",
    "zelda": "Zelda",
    "agatha-christie": "Agatha Christie",
    "asterix": "Astérix",
    "bd-franco-belge": "BD franco-belge",
    "harry-potter": "Harry Potter",
    "litterature-francaise": "Littérature française",
    "mythologie-grecque": "Mythologie grecque",
    "mythologie-nordique": "Mythologie nordique",
    "sherlock-holmes": "Sherlock Holmes",
    "tintin": "Tintin",
    "death-note": "Death Note",
    "demon-slayer": "Demon Slayer",
    "dragon-ball": "Dragon Ball",
    "fullmetal-alchemist": "Fullmetal Alchemist",
    "jujutsu-kaisen": "Jujutsu Kaisen",
    "attaque-des-titans": "L'Attaque des Titans",
    "my-hero-academia": "My Hero Academia",
    "naruto": "Naruto",
    "one-piece": "One Piece",
    "ghibli": "Studio Ghibli",
    "variete-francaise": "Chanson française",
    "eurovision": "Eurovision",
    "beatles": "Les Beatles",
    "michael-jackson": "Michael Jackson",
    "musique-classique": "Musique classique",
    "rap-francais": "Rap français",
    "rock": "Rock",
    "electro-francaise": "Électro",
    "football": "Football",
    "formule-1": "Formule 1",
    "jeux-olympiques": "Jeux olympiques",
    "ligue-des-champions": "Ligue des champions",
    "nba": "NBA",
    "rugby": "Rugby",
    "tennis": "Tennis",
    "tour-de-france": "Tour de France",
    "internet-memes": "Internet et mèmes",
    "twitch": "Twitch et streamers",
    "youtubeurs": "YouTubeurs français",
    "animaux": "Animaux",
    "capitales": "Capitales du monde",
    "chimie": "Chimie",
    "corps-humain": "Corps humain",
    "cuisine-francaise": "Cuisine française",
    "dinosaures": "Dinosaures",
    "espace": "Espace",
    "geographie-france": "Géographie de France",
    "histoire-france": "Histoire de France",
    "inventions": "Inventions",
    "langue-francaise": "Langue française",
    "monuments": "Monuments du monde",
    "peinture": "Peinture",
    "rois-de-france": "Rois de France",
    "seconde-guerre-mondiale": "Seconde Guerre mondiale",
    "vins-fromages": "Vins et fromages",
};
export const QUIZZ_TOPIC_IDS = Object.keys(QUIZZ_TOPIC_NAMES);

// Catégorie de chaque thème du site (statistiques par catégorie) : un test du site vérifie que la liste est à jour
export const QUIZZ_TOPIC_CATEGORIES: Record<string, string> = {
    "cars": "cinema",
    "comedies-francaises": "cinema",
    "disney": "cinema",
    "films-horreur": "cinema",
    "james-bond": "cinema",
    "jurassic-park": "cinema",
    "seigneur-des-anneaux": "cinema",
    "marvel": "cinema",
    "oscars": "cinema",
    "pirates-des-caraibes": "cinema",
    "pixar": "cinema",
    "retour-vers-le-futur": "cinema",
    "star-wars": "cinema",
    "tarantino": "cinema",
    "arcane": "series",
    "breaking-bad": "series",
    "brooklyn-nine-nine": "series",
    "cyberpunk-edgerunners": "series",
    "doctor-who": "series",
    "friends": "series",
    "game-of-thrones": "series",
    "kaamelott": "series",
    "casa-de-papel": "series",
    "simpson": "series",
    "stranger-things": "series",
    "the-100": "series",
    "the-office": "series",
    "the-witcher": "series",
    "assassins-creed": "jeux-video",
    "cyberpunk": "jeux-video",
    "souls": "jeux-video",
    "final-fantasy": "jeux-video",
    "fortnite": "jeux-video",
    "gta": "jeux-video",
    "league-of-legends": "jeux-video",
    "mario": "jeux-video",
    "minecraft": "jeux-video",
    "pokemon": "jeux-video",
    "retro-gaming": "jeux-video",
    "skyrim": "jeux-video",
    "warhammer": "jeux-video",
    "zelda": "jeux-video",
    "agatha-christie": "livres",
    "asterix": "livres",
    "bd-franco-belge": "livres",
    "harry-potter": "livres",
    "litterature-francaise": "livres",
    "mythologie-grecque": "livres",
    "mythologie-nordique": "livres",
    "sherlock-holmes": "livres",
    "tintin": "livres",
    "death-note": "anime",
    "demon-slayer": "anime",
    "dragon-ball": "anime",
    "fullmetal-alchemist": "anime",
    "jujutsu-kaisen": "anime",
    "attaque-des-titans": "anime",
    "my-hero-academia": "anime",
    "naruto": "anime",
    "one-piece": "anime",
    "ghibli": "anime",
    "variete-francaise": "musique",
    "eurovision": "musique",
    "beatles": "musique",
    "michael-jackson": "musique",
    "musique-classique": "musique",
    "rap-francais": "musique",
    "rock": "musique",
    "electro-francaise": "musique",
    "football": "sport",
    "formule-1": "sport",
    "jeux-olympiques": "sport",
    "ligue-des-champions": "sport",
    "nba": "sport",
    "rugby": "sport",
    "tennis": "sport",
    "tour-de-france": "sport",
    "internet-memes": "internet",
    "twitch": "internet",
    "youtubeurs": "internet",
    "animaux": "culture",
    "capitales": "culture",
    "chimie": "culture",
    "corps-humain": "culture",
    "cuisine-francaise": "culture",
    "dinosaures": "culture",
    "espace": "culture",
    "geographie-france": "culture",
    "histoire-france": "culture",
    "inventions": "culture",
    "langue-francaise": "culture",
    "monuments": "culture",
    "peinture": "culture",
    "rois-de-france": "culture",
    "seconde-guerre-mondiale": "culture",
    "vins-fromages": "culture",
};

// Crédits offerts à l'auteur d'une question validée (avec une notification)
export const QUIZZ_APPROVED_CREDITS = 10;

export const QUESTION_MIN = 5;
export const QUESTION_MAX = 200;
export const ANSWER_MAX = 80;
// questions envoyées d'un coup, au plus (le formulaire en ajoute autant qu'on veut avec « + »)
export const BATCH_MAX = 100;

export const isQuizzTopic = (id: string): boolean => Object.hasOwn(QUIZZ_TOPIC_NAMES, id);

// Une question : 4 réponses, la bonne en premier
export type QuestionInput = { question: string; answers: [string, string, string, string] };

const clean = (value: unknown): string => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

// Problème d'une question (texte à afficher), ou null si elle est bonne
export function questionProblem(q: { question: string; answers: string[] }): string | null {
    if (q.question.length < QUESTION_MIN) return "La question est trop courte";
    if (q.question.length > QUESTION_MAX) return `La question dépasse ${QUESTION_MAX} caractères`;
    if (q.answers.length !== 4 || q.answers.some(a => !a)) return "Il faut remplir les 4 réponses";
    if (q.answers.some(a => a.length > ANSWER_MAX)) return `Une réponse dépasse ${ANSWER_MAX} caractères`;
    if (new Set(q.answers.map(a => a.toLowerCase())).size !== 4) return "Les 4 réponses doivent être différentes";
    return null;
}

export function parseQuestion(body: unknown): QuestionInput | string {
    const b = (body ?? {}) as Record<string, unknown>;
    const answers = Array.isArray(b.answers) ? b.answers.map(clean) : [];
    const q = {question: clean(b.question), answers};
    const problem = questionProblem(q);
    return problem ?? {question: q.question, answers: answers as QuestionInput["answers"]};
}

// Envoi de plusieurs questions d'un coup : toutes valides, ou le message de la première fautive (« Question 3 : … »)
export function parseQuestions(body: unknown): QuestionInput[] | string {
    const list = (body as { questions?: unknown } | null)?.questions;
    if (!Array.isArray(list) || list.length === 0) return "Ajoute au moins une question";
    if (list.length > BATCH_MAX) return `${BATCH_MAX} questions au plus par envoi`;
    const out: QuestionInput[] = [];
    for (const [i, item] of list.entries()) {
        const q = parseQuestion(item);
        if (typeof q === "string") return `Question ${i + 1} : ${q.charAt(0).toLowerCase()}${q.slice(1)}`;
        out.push(q);
    }
    return out;
}

export type ReviewInput = { status: "approved" | "rejected"; edit: QuestionInput | null };

// Décision de l'administrateur : valider (éventuellement après correction) ou refuser
export function parseReview(body: unknown): ReviewInput | string {
    const b = (body ?? {}) as Record<string, unknown>;
    if (b.status !== "approved" && b.status !== "rejected") return "Choisis « Valider » ou « Refuser »";
    if (b.question === undefined && b.answers === undefined) return {status: b.status, edit: null};
    const edit = parseQuestion(b);
    return typeof edit === "string" ? edit : {status: b.status, edit};
}

// ---------- Questions contestées en fin de partie

export const REPORT_REASON_MAX = 300;

// Contestation d'un joueur : la question jouée (la bonne réponse du jeu en premier), sa réponse, son explication
export type ReportInput = { topicId: string; question: string; answers: QuestionInput["answers"]; picked: string | null; reason: string };

export function parseReport(body: unknown): ReportInput | string {
    const b = (body ?? {}) as Record<string, unknown>;
    const topicId = typeof b.topicId === "string" && /^[a-z0-9-]{1,60}$/.test(b.topicId) ? b.topicId : null;
    if (!topicId) return "Thème introuvable";
    const q = parseQuestion(b);
    if (typeof q === "string") return "Question introuvable";
    const picked = b.picked === null || b.picked === undefined ? null : clean(b.picked);
    if (picked !== null && !q.answers.includes(picked)) return "Réponse introuvable";
    const reason = clean(b.reason);
    if (reason.length > REPORT_REASON_MAX) return `L'explication dépasse ${REPORT_REASON_MAX} caractères`;
    return {topicId, question: q.question, answers: q.answers, picked, reason};
}

export type ReportReview = { topicId: string; question: string; status: "fixed" | "dismissed"; edit: QuestionInput | null };

// Décision de l'administrateur sur une question contestée : corrigée (avec la correction, pour une question des
// joueurs) ou réponse juste
export function parseReportReview(body: unknown): ReportReview | string {
    const b = (body ?? {}) as Record<string, unknown>;
    if (b.status !== "fixed" && b.status !== "dismissed") return "Choisis « Corrigée » ou « La réponse est juste »";
    if (typeof b.topicId !== "string" || typeof b.question !== "string") return "Question introuvable";
    if (b.edit === undefined || b.edit === null) return {topicId: b.topicId, question: b.question, status: b.status, edit: null};
    const edit = parseQuestion(b.edit);
    return typeof edit === "string" ? edit : {topicId: b.topicId, question: b.question, status: b.status, edit};
}
