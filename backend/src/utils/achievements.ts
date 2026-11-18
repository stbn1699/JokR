import {UPGRADES} from "./upgrades.js";

/*
 * Succès : la liste complète, partagée par le serveur (qui les débloque) et le site (page /succes, popups).
 *
 * Chaque succès regarde une seule statistique du joueur (`stat`) et se débloque quand elle atteint la cible :
 * `gte` (au moins `target`, le cas courant), `lte` (au plus : une place, un temps) ou `eq` (exactement : un solde).
 * Les statistiques sont tenues par services/achievements (compteurs, records, séries) ou lues en direct dans la
 * base pour ce qui est un état du compte (solde, niveau, objets possédés, niveaux réussis…).
 *
 * Récompense : des jetons selon le palier (ACHIEVEMENT_REWARDS), versés au déblocage.
 * Un succès secret n'affiche ni son nom ni sa condition tant qu'il n'est pas débloqué.
 *
 * Ne jamais changer l'identifiant d'un succès existant : il est enregistré pour les joueurs qui l'ont.
 */

export type AchievementTier = 1 | 2 | 3 | 4 | 5;

export const ACHIEVEMENT_REWARDS: Record<AchievementTier, number> = {1: 25, 2: 100, 3: 500, 4: 2500, 5: 10000};
export const ACHIEVEMENT_TIER_NAMES: Record<AchievementTier, string> = {1: "Bronze", 2: "Argent", 3: "Or", 4: "Diamant", 5: "Légendaire"};

export const ACHIEVEMENT_CATEGORIES = [
    {id: "fortune", name: "Fortune"},
    {id: "profil", name: "Profil"},
    {id: "boutique", name: "Boutique"},
    {id: "daily", name: "Défis du jour"},
    {id: "niveaux", name: "Mode Niveaux"},
    {id: "puzzles", name: "Puzzles"},
    {id: "hasard", name: "Hasard"},
    {id: "social", name: "Amis"},
    {id: "secrets", name: "Occasions"},
    {id: "troll", name: "Pas de chance"},
    {id: "meta", name: "Collection"},
] as const;
export type AchievementCategory = typeof ACHIEVEMENT_CATEGORIES[number]["id"];

export type Achievement = {
    id: string;
    category: AchievementCategory;
    name: string;
    description: string;
    tier: AchievementTier;
    stat: string;
    target: number;
    op: "gte" | "lte" | "eq";
    secret: boolean;
    // sous-groupe affiché sur la page (un jeu, une famille de paliers)
    group?: string;
};

// ---------- Ce dont les succès parlent

export const ACHIEVEMENT_PUZZLES = [
    {code: "SUDOKU", name: "Sudoku"},
    {code: "QUEENS", name: "Queens"},
    {code: "RIKUDO", name: "Rikudo"},
    {code: "GALAXIES", name: "Galaxies"},
    {code: "TECTONIC", name: "Tectonic"},
    {code: "SHIKAKU", name: "Shikaku"},
    {code: "TRACE", name: "Tracé"},
    {code: "BINERO", name: "Binero"},
] as const;

// Mondes du mode Niveaux (mêmes noms que src/Components/Levels/worlds.ts), 50 niveaux chacun
export const ACHIEVEMENT_WORLDS = [
    "La Plaine", "La Forêt", "La Rivière", "La Côte", "Les Marais", "La Savane", "Le Désert", "Le Canyon", "La Montagne",
    "La Banquise", "Les Aurores", "Les Cerisiers", "La Jungle", "Les Abysses", "Les Cristaux", "Le Volcan",
    "La Cité perdue", "Les Îles célestes", "L'Orage", "Le Cosmos",
] as const;
export const ACHIEVEMENT_WORLD_SIZE = 50;

// Temps à battre aux défis du jour (« Éclair » ; « Foudre » : la moitié), en millisecondes
export const DAILY_FAST_MS: Record<string, number> = {
    SUDOKU: 240_000, BINERO: 180_000, RIKUDO: 120_000, TECTONIC: 180_000,
    GALAXIES: 120_000, SHIKAKU: 90_000, QUEENS: 60_000, TRACE: 60_000,
};

// Catégories de la boutique qu'on peut acheter en entier (stat shop.complete.<id>)
export const SHOP_CATEGORIES = [
    {id: "gradients", name: "dégradés"},
    {id: "animated", name: "fonds animés"},
    {id: "patterns", name: "motifs"},
    {id: "colors", name: "couleurs de motifs"},
    {id: "victory", name: "effets de victoire"},
    {id: "images", name: "fonds illustrés"},
    {id: "chips", name: "jeux de jetons"},
    {id: "balls", name: "billes de Plinko"},
] as const;

export const SLOT_MACHINE_NAMES = [{id: "classique", name: "Classique"}, {id: "jokr", name: "JokR"}] as const;

export const PLINKO_RISK_NAMES = [
    {id: "low", name: "prudent", tier: 2},
    {id: "medium", name: "équilibré", tier: 3},
    {id: "high", name: "risqué", tier: 4},
    {id: "extreme", name: "extrême", tier: 5},
] as const;

export const POKER_HAND_ACHIEVEMENTS = [
    {hand: "jacksOrBetter", name: "Paire de valets ou mieux", tier: 1},
    {hand: "twoPair", name: "Double paire", tier: 1},
    {hand: "threeKind", name: "Brelan", tier: 1},
    {hand: "straight", name: "Quinte", tier: 2},
    {hand: "flush", name: "Couleur", tier: 2},
    {hand: "fullHouse", name: "Full", tier: 2},
    {hand: "fourKind", name: "Carré", tier: 3},
    {hand: "straightFlush", name: "Quinte flush", tier: 4},
    {hand: "royal", name: "Quinte flush royale", tier: 5},
] as const;

// Jeux du Hasard à faire le même jour (« Tournée générale ») : un bit chacun dans la stat casino.day.games
export const CASINO_DAY_GAMES = ["plinko", "roulette", "slots", "blackjack", "poker", "keno", "wheel"] as const;

// ---------- Construction de la liste

const fmt = (n: number) => n.toLocaleString("fr-FR");
const list: Achievement[] = [];

type Def = Omit<Achievement, "op" | "secret"> & Partial<Pick<Achievement, "op" | "secret">>;
function add(def: Def) {
    list.push({op: "gte", secret: false, ...def});
}

// Paliers d'une même statistique : [cible, palier, nom?]
function steps(base: Omit<Def, "id" | "name" | "description" | "target" | "tier">, id: string,
    values: [number, AchievementTier, string?][], name: (n: number) => string, description: (n: number) => string) {
    for (const [target, tier, title] of values) {
        add({...base, id: `${id}-${target}`, name: title ?? name(target), description: description(target), target, tier});
    }
}

// ----- 1. Fortune
steps({category: "fortune", stat: "credits", group: "Solde"}, "balance", [
    [10, 1], [25, 1], [50, 1], [100, 1], [200, 1], [500, 1], [1000, 1, "Premier millier"], [2000, 2], [5000, 2], [10_000, 2, "Cinq chiffres"],
    [20_000, 3], [50_000, 3], [100_000, 3, "Six chiffres"], [200_000, 4], [500_000, 4], [1_000_000, 5, "Millionnaire"],
], n => `${fmt(n)} jetons`, n => `Avoir ${fmt(n)} jetons en poche`);

steps({category: "fortune", stat: "earned.total", group: "Jetons gagnés au total"}, "earned", [
    [1000, 1], [10_000, 2], [50_000, 2], [100_000, 3], [500_000, 3], [1_000_000, 4], [5_000_000, 4], [10_000_000, 5, "Pluie d'or"],
], n => `${fmt(n)} gagnés`, n => `Gagner ${fmt(n)} jetons au total (puzzles, gains du Hasard, roue, loteries)`);

steps({category: "fortune", stat: "spent.total", group: "Jetons dépensés au total"}, "spent", [
    [1000, 1], [10_000, 2], [50_000, 2], [100_000, 3, "Flambeur"], [500_000, 3], [1_000_000, 4], [5_000_000, 4], [10_000_000, 5, "Panier percé"],
], n => `${fmt(n)} dépensés`, n => `Dépenser ${fmt(n)} jetons au total (mises et boutique)`);

steps({category: "fortune", stat: "spent.day.best", group: "Dépensés en une journée"}, "spent-day", [
    [500, 1], [1000, 1], [5000, 2], [10_000, 2], [50_000, 3], [100_000, 4], [500_000, 5, "Folie des grandeurs"],
], n => `${fmt(n)} en un jour`, n => `Dépenser ${fmt(n)} jetons dans la même journée`);

add({category: "fortune", id: "broke", name: "Fauché", description: "Descendre à 1 jeton ou moins", tier: 1, stat: "credits", target: 1, op: "lte", secret: true});
add({category: "fortune", id: "phoenix", name: "Phénix", description: "Remonter de moins de 10 jetons à plus de 10 000", tier: 4, stat: "phoenix", target: 1, secret: true});
add({category: "fortune", id: "saver", name: "Économe", description: "Garder plus de 10 000 jetons pendant 30 jours de suite", tier: 3, stat: "rich.days", target: 30});

// ----- 2. Profil
const LEVEL_TIERS: [number, string, AchievementTier][] = [
    [5, "Cuivre", 1], [10, "Argent", 1], [15, "Or", 2], [20, "Émeraude", 2], [30, "Rubis", 2], [40, "Saphir", 3],
    [50, "Améthyste", 3], [60, "Obsidienne", 3], [70, "Diamant", 4], [80, "Opale", 4], [90, "Nébuleuse", 4], [100, "Platine", 5],
];
for (const [level, name, tier] of LEVEL_TIERS) {
    add({category: "profil", id: `tier-${level}`, name: `Palier ${name}`, description: `Atteindre le niveau ${level} (couleur ${name} sur le profil)`,
        tier, stat: "level", target: level, group: "Paliers de couleur"});
}
add({category: "profil", id: "avatar", name: "Nouvelle tête", description: "Changer d'avatar", tier: 1, stat: "avatar.changes", target: 1});
add({category: "profil", id: "tour", name: "Visite guidée", description: "Finir la visite de l'interface", tier: 1, stat: "client.tour", target: 1});
add({category: "profil", id: "changelog", name: "Curieux", description: "Ouvrir la page des nouveautés", tier: 1, stat: "client.changelog", target: 1});
add({category: "profil", id: "account-year", name: "Un an déjà", description: "Avoir un compte depuis un an", tier: 3, stat: "account.days", target: 365, secret: true});

// ----- 3. Boutique
steps({category: "boutique", stat: "shop.bought", group: "Collection"}, "shop-items", [
    [1, 1, "Premier achat"], [10, 2, "Collectionneur"], [25, 3, "Grand collectionneur"], [50, 4, "Accumulateur"],
], n => `${n} objets`, n => (n === 1 ? "Acheter un objet dans la boutique" : `Avoir ${n} objets achetés dans la boutique`));
for (const cat of SHOP_CATEGORIES) {
    add({category: "boutique", id: `shop-all-${cat.id}`, name: `Tous les ${cat.name}`, description: `Acheter tous les ${cat.name} de la boutique`,
        tier: 3, stat: `shop.complete.${cat.id}`, target: 1, group: "Catégories complètes"});
}
add({category: "boutique", id: "upgrade-first", name: "Amélioré", description: "Acheter un premier niveau d'amélioration", tier: 1, stat: "upgrades.owned", target: 1, group: "Améliorations"});
for (const u of UPGRADES) {
    add({category: "boutique", id: `upgrade-max-${u.id}`, name: `${u.name} au maximum`,
        description: `Pousser l'amélioration « ${u.name} » au dernier niveau (${u.levels.at(-1)!.label})`,
        tier: 2, stat: `upgrade.${u.id}`, target: u.levels.length, group: "Améliorations"});
}
add({category: "boutique", id: "upgrade-all", name: "Tout amélioré", description: "Avoir toutes les améliorations au maximum", tier: 4, stat: "shop.complete.upgrades", target: 1, group: "Améliorations"});
add({category: "boutique", id: "shop-all", name: "Toute la boutique", description: "Acheter absolument tout ce que vend la boutique", tier: 5, stat: "shop.complete.all", target: 1});

// ----- 4. Défis du jour
const RANKS: [number, string, AchievementTier, AchievementTier][] = [
    [50, "Top 50", 1, 3], [10, "Top 10", 2, 4], [3, "Podium", 3, 4], [1, "Numéro 1", 3, 5],
];
for (const g of ACHIEVEMENT_PUZZLES) {
    for (const [rank, label, tier] of RANKS) {
        add({category: "daily", id: `daily-rank-${rank}-${g.code}`, name: `${label} : ${g.name}`,
            description: rank === 1 ? `Finir 1er au classement final du défi du jour ${g.name}` : `Finir dans les ${rank} premiers du défi du jour ${g.name}`,
            tier, stat: `daily.best.${g.code}`, target: rank, op: "lte", group: g.name});
    }
}
for (const [rank, label, , tier] of RANKS) {
    add({category: "daily", id: `daily-rank-${rank}-all`, name: `${label} partout`,
        description: rank === 1 ? "Avoir fini 1er au moins une fois sur chacun des 8 défis du jour" : `Avoir fini dans les ${rank} premiers au moins une fois sur chacun des 8 défis du jour`,
        tier, stat: "daily.best.all", target: rank, op: "lte", group: "Tous les défis"});
}
add({category: "daily", id: "daily-slam", name: "Grand Chelem", description: "Finir 1er sur les 8 défis du jour le même jour", tier: 5, stat: "daily.slam", target: 1, secret: true, group: "Tous les défis"});
add({category: "daily", id: "daily-fullday", name: "Journée complète", description: "Finir les 8 défis du jour dans la même journée", tier: 2, stat: "daily.fullday", target: 1, group: "Régularité"});
add({category: "daily", id: "daily-perfect-week", name: "Semaine parfaite", description: "Finir les 8 défis du jour 7 jours de suite", tier: 4, stat: "daily.fullday.streak.best", target: 7, group: "Régularité"});
steps({category: "daily", stat: "daily.streak.best", group: "Régularité"}, "daily-streak", [
    [3, 1], [7, 1], [14, 2], [30, 3], [100, 4], [365, 5, "Une année sans faillir"],
], n => `${n} jours de suite`, n => `Finir au moins un défi du jour ${n} jours de suite`);
steps({category: "daily", stat: "daily.done", group: "Régularité"}, "daily-done", [
    [10, 1], [100, 2], [500, 3], [1000, 4],
], n => `${fmt(n)} défis`, n => `Finir ${fmt(n)} défis du jour au total`);
for (const g of ACHIEVEMENT_PUZZLES) {
    const fast = DAILY_FAST_MS[g.code]!;
    const time = (ms: number) => (ms >= 60_000 ? `${ms / 60_000} min` : `${ms / 1000} s`);
    add({category: "daily", id: `daily-clean-${g.code}`, name: `Sans faute : ${g.name}`, description: `Finir le défi du jour ${g.name} sans envoyer de grille fausse`,
        tier: 2, stat: `daily.clean.${g.code}`, target: 1, group: g.name});
    add({category: "daily", id: `daily-perfect-${g.code}`, name: `Perfectionniste : ${g.name}`, description: `Finir 10 défis du jour ${g.name} de suite sans grille fausse`,
        tier: 3, stat: `daily.clean.${g.code}.streak.best`, target: 10, group: g.name});
    add({category: "daily", id: `daily-fast-${g.code}`, name: `Éclair : ${g.name}`, description: `Finir le défi du jour ${g.name} en moins de ${time(fast)}`,
        tier: 3, stat: `daily.fastest.${g.code}`, target: fast, op: "lte", group: g.name});
    add({category: "daily", id: `daily-faster-${g.code}`, name: `Foudre : ${g.name}`, description: `Finir le défi du jour ${g.name} en moins de ${time(fast / 2)}`,
        tier: 4, stat: `daily.fastest.${g.code}`, target: fast / 2, op: "lte", group: g.name});
}
add({category: "daily", id: "daily-queens-60", name: "Reine des reines", description: "Finir 30 défis du jour Queens en moins d'une minute chacun", tier: 4, stat: "daily.queens.under60", target: 30, group: "Queens"});
add({category: "daily", id: "daily-early", name: "Lève-tôt", description: "Finir un défi du jour avant 7 h", tier: 1, stat: "daily.early", target: 1, secret: true, group: "Horaires"});
add({category: "daily", id: "daily-night", name: "Oiseau de nuit", description: "Finir un défi du jour entre 2 h et 5 h du matin", tier: 1, stat: "daily.night", target: 1, secret: true, group: "Horaires"});
add({category: "daily", id: "daily-last-minute", name: "Dernière minute", description: "Finir un défi du jour à 23 h 59", tier: 2, stat: "daily.lastminute", target: 1, secret: true, group: "Horaires"});

// ----- 5. Mode Niveaux
const worldTier = (n: number): AchievementTier => (n <= 3 ? 1 : n <= 7 ? 2 : n <= 12 ? 3 : n <= 19 ? 4 : 5);
for (const g of ACHIEVEMENT_PUZZLES) {
    ACHIEVEMENT_WORLDS.forEach((world, i) => {
        add({category: "niveaux", id: `world-${g.code}-${i + 1}`, name: `${g.name} : ${world}`,
            description: i === 0 ? `Finir le tutoriel de ${g.name} pour ouvrir le monde 1` : `Atteindre le monde ${i + 1} de ${g.name}`,
            tier: worldTier(i + 1), stat: `world.${g.code}`, target: i + 1, group: g.name});
    });
    steps({category: "niveaux", stat: `levels.${g.code}`, group: g.name}, `levels-${g.code}`, [
        [10, 1], [100, 2], [250, 3], [500, 4], [1000, 5, `${g.name} terminé`],
    ], n => `${g.name} : ${fmt(n)} niveaux`, n => `Réussir ${fmt(n)} niveaux de ${g.name}`);
}
add({category: "niveaux", id: "worlds-min-1", name: "Élève modèle", description: "Finir les tutoriels des 8 jeux", tier: 2, stat: "world.min", target: 1, group: "Tous les jeux"});
add({category: "niveaux", id: "worlds-min-3", name: "Explorateur", description: "Atteindre le monde 3 dans les 8 jeux", tier: 2, stat: "world.min", target: 3, group: "Tous les jeux"});
add({category: "niveaux", id: "worlds-min-5", name: "Polyvalent", description: "Atteindre le monde 5 dans les 8 jeux", tier: 3, stat: "world.min", target: 5, group: "Tous les jeux"});
add({category: "niveaux", id: "worlds-min-10", name: "Globe-trotteur", description: "Atteindre le monde 10 dans les 8 jeux", tier: 4, stat: "world.min", target: 10, group: "Tous les jeux"});
add({category: "niveaux", id: "worlds-min-20", name: "Maître de tout", description: "Atteindre le monde 20 dans les 8 jeux", tier: 5, stat: "world.min", target: 20, group: "Tous les jeux"});
steps({category: "niveaux", stat: "levels.total", group: "Tous les jeux"}, "levels-total", [
    [100, 2], [500, 2], [1000, 3], [2000, 3], [4000, 4], [8000, 5, "Tout le mode Niveaux"],
], n => `${fmt(n)} niveaux`, n => `Réussir ${fmt(n)} niveaux, tous jeux confondus`);

// ----- 6. Puzzles
for (const g of ACHIEVEMENT_PUZZLES) {
    steps({category: "puzzles", stat: `wins.${g.code}`, group: g.name}, `wins-${g.code}`, [
        [10, 1], [100, 2], [1000, 3],
    ], n => `${g.name} : ${fmt(n)} grilles`, n => `Finir ${fmt(n)} grilles de ${g.name}`);
}
add({category: "puzzles", id: "galaxies-big", name: "Big Bang", description: "Finir une grille de Galaxies de la plus grande taille (10×10)", tier: 3, stat: "maxsize.GALAXIES", target: 10, group: "Galaxies"});
add({category: "puzzles", id: "puzzles-day-50", name: "Insomniaque", description: "Finir 50 grilles dans la même journée", tier: 3, stat: "puzzles.day.best", target: 50, secret: true});

// ----- 7. Hasard
// Plinko
for (const r of PLINKO_RISK_NAMES) {
    add({category: "hasard", id: `plinko-edge-${r.id}`, name: `Tout au bord (${r.name})`, description: `Faire tomber une bille dans la case maximale du tableau ${r.name}`,
        tier: r.tier, stat: `plinko.edge.${r.id}`, target: 1, group: "Plinko"});
}
steps({category: "hasard", stat: "plinko.balls", group: "Plinko"}, "plinko-balls", [[100, 1], [1000, 2], [10_000, 3]],
    n => `${fmt(n)} billes`, n => `Lâcher ${fmt(n)} billes de Plinko`);
add({category: "hasard", id: "plinko-center", name: "Pile au centre", description: "10 billes de suite dans les 3 cases du milieu", tier: 3, stat: "plinko.center.streak.best", target: 10, group: "Plinko"});
add({category: "hasard", id: "plinko-max-bet-edge", name: "Tout ou rien", description: "La case maximale avec la mise maximale", tier: 5, stat: "plinko.edge.maxbet", target: 1, secret: true, group: "Plinko"});
// Roulette
add({category: "hasard", id: "roulette-zero", name: "Zéro gagnant", description: "Avoir misé sur le 0 quand il sort", tier: 3, stat: "roulette.zero", target: 1, secret: true, group: "Roulette"});
add({category: "hasard", id: "roulette-straight", name: "Plein", description: "Gagner sur un numéro seul", tier: 2, stat: "roulette.straight", target: 1, group: "Roulette"});
add({category: "hasard", id: "roulette-same-twice", name: "Le même", description: "Gagner deux tours de suite sur le même numéro seul", tier: 5, stat: "roulette.sametwice", target: 1, group: "Roulette"});
add({category: "hasard", id: "roulette-color-10", name: "Rouge et noir", description: "Gagner 10 tours de suite sur une couleur", tier: 4, stat: "roulette.color.streak.best", target: 10, group: "Roulette"});
add({category: "hasard", id: "roulette-cover", name: "Couvrir la table", description: "Miser sur les 37 numéros dans le même tour", tier: 2, stat: "roulette.cover", target: 1, group: "Roulette"});
add({category: "hasard", id: "roulette-play", name: "En direct", description: "Jouer un tour de roulette en direct", tier: 1, stat: "roulette.rounds", target: 1, group: "Roulette"});
add({category: "hasard", id: "roulette-wins-100", name: "Habitué de la table", description: "Gagner 100 tours de roulette", tier: 3, stat: "roulette.wins", target: 100, group: "Roulette"});
add({category: "hasard", id: "roulette-all-in", name: "Tapis", description: "Miser tout son solde (plus de 1 000 jetons) sur un tour et gagner", tier: 4, stat: "roulette.allin", target: 1, secret: true, group: "Roulette"});
// Machines à sous
for (const m of SLOT_MACHINE_NAMES) {
    add({category: "hasard", id: `slots-${m.id}-win`, name: `${m.name} : premier gain`, description: `Gagner sur la machine ${m.name}`, tier: 1, stat: `slots.${m.id}.wins`, target: 1, group: "Machines à sous"});
    add({category: "hasard", id: `slots-${m.id}-top`, name: `${m.name} : ligne royale`, description: `Une ligne complète du symbole le plus cher sur la machine ${m.name}`, tier: 3, stat: `slots.${m.id}.top`, target: 1, group: "Machines à sous"});
    add({category: "hasard", id: `slots-${m.id}-wild`, name: `${m.name} : que des jokers`, description: `Une ligne entière de jokers sur la machine ${m.name}`, tier: 4, stat: `slots.${m.id}.wild`, target: 1, group: "Machines à sous"});
    add({category: "hasard", id: `slots-${m.id}-jackpot`, name: `${m.name} : jackpot`, description: `5 jokers alignés sur 5 colonnes, machine ${m.name}`, tier: 5, stat: `slots.${m.id}.jackpot`, target: 1, group: "Machines à sous"});
}
add({category: "hasard", id: "slots-rainbow", name: "Arc-en-ciel", description: "Les 10 lignes qui paient sur le même lancer", tier: 5, stat: "slots.rainbow", target: 1, group: "Machines à sous"});
steps({category: "hasard", stat: "slots.spins", group: "Machines à sous"}, "slots-spins", [[100, 1], [1000, 2], [10_000, 3]],
    n => `${fmt(n)} lancers`, n => `Faire tourner les machines à sous ${fmt(n)} fois`);
// Blackjack
steps({category: "hasard", stat: "bj.naturals", group: "Blackjack"}, "bj-natural", [[1, 1, "Blackjack !"], [5, 2], [50, 3]],
    n => `${n} blackjacks`, n => (n === 1 ? "Avoir un blackjack (as et figure) d'entrée" : `Avoir ${n} blackjacks d'entrée au total`));
add({category: "hasard", id: "bj-double-win", name: "Doubler et gagner", description: "Gagner une main après avoir doublé", tier: 1, stat: "bj.doublewin", target: 1, group: "Blackjack"});
add({category: "hasard", id: "bj-split-win", name: "Split gagnant", description: "Gagner les deux mains d'un split", tier: 2, stat: "bj.splitwin", target: 1, group: "Blackjack"});
add({category: "hasard", id: "bj-five-cards", name: "Cinq cartes", description: "Avoir 5 cartes sans dépasser 21", tier: 3, stat: "bj.fivecards", target: 1, group: "Blackjack"});
add({category: "hasard", id: "bj-777", name: "Trois sept", description: "Faire 21 avec 7, 7 et 7", tier: 4, stat: "bj.777", target: 1, secret: true, group: "Blackjack"});
add({category: "hasard", id: "bj-win-10", name: "Série gagnante", description: "Gagner 10 mains de suite", tier: 4, stat: "bj.win.streak.best", target: 10, group: "Blackjack"});
// Poker
for (const h of POKER_HAND_ACHIEVEMENTS) {
    add({category: "hasard", id: `poker-${h.hand}`, name: h.name, description: `Finir une main de poker sur : ${h.name.toLowerCase()}`, tier: h.tier, stat: `poker.${h.hand}`, target: 1, group: "Poker"});
}
add({category: "hasard", id: "poker-aces", name: "Carré d'as", description: "Un carré d'as au poker", tier: 4, stat: "poker.fouraces", target: 1, secret: true, group: "Poker"});
add({category: "hasard", id: "poker-redraw", name: "Tout jeter", description: "Remplacer les 5 cartes et toucher au moins un brelan", tier: 3, stat: "poker.redraw", target: 1, secret: true, group: "Poker"});
// Keno
add({category: "hasard", id: "keno-5", name: "Bon numéro", description: "Trouver 5 numéros sur une partie de Keno", tier: 1, stat: "keno.hits.best", target: 5, group: "Keno"});
add({category: "hasard", id: "keno-8", name: "Voyant", description: "Trouver 8 numéros sur une partie de Keno", tier: 3, stat: "keno.hits.best", target: 8, group: "Keno"});
add({category: "hasard", id: "keno-10", name: "Grand voyant", description: "Trouver les 10 numéros tirés au Keno", tier: 5, stat: "keno.hits.best", target: 10, group: "Keno"});
add({category: "hasard", id: "keno-15", name: "Grille pleine", description: "Jouer une partie de Keno avec 15 numéros cochés", tier: 1, stat: "keno.picks15", target: 1, group: "Keno"});
// Loterie
add({category: "hasard", id: "lottery-ticket", name: "Premier ticket", description: "Participer à un tirage de loterie", tier: 1, stat: "lottery.tickets", target: 1, group: "Loterie"});
add({category: "hasard", id: "lottery-day", name: "Gros lot du jour", description: "Gagner la loterie du jour", tier: 3, stat: "lottery.win.day", target: 1, group: "Loterie"});
add({category: "hasard", id: "lottery-week", name: "Gros lot de la semaine", description: "Gagner la loterie de la semaine", tier: 4, stat: "lottery.win.week", target: 1, group: "Loterie"});
add({category: "hasard", id: "lottery-month", name: "Gros lot du mois", description: "Gagner la loterie du mois", tier: 5, stat: "lottery.win.month", target: 1, group: "Loterie"});
add({category: "hasard", id: "lottery-one-ticket", name: "Miraculé", description: "Gagner une loterie avec un seul ticket", tier: 5, stat: "lottery.onewin", target: 1, secret: true, group: "Loterie"});
steps({category: "hasard", stat: "lottery.tickets", group: "Loterie"}, "lottery-tickets", [[100, 1], [1000, 2], [10_000, 3]],
    n => `${fmt(n)} tickets`, n => `Avoir eu ${fmt(n)} tickets de loterie au total`);
// Roue
add({category: "hasard", id: "wheel-first", name: "La roue tourne", description: "Lancer la roue du jour", tier: 1, stat: "wheel.spins", target: 1, group: "Roue du jour"});
add({category: "hasard", id: "wheel-jackpot", name: "Jackpot de la roue", description: "Tomber sur la case à 1 000 jetons", tier: 4, stat: "wheel.jackpot", target: 1, group: "Roue du jour"});
add({category: "hasard", id: "wheel-all", name: "Tour du cadran", description: "Être tombé au moins une fois sur chaque case de la roue", tier: 4, stat: "wheel.segments", target: 15, group: "Roue du jour"});
add({category: "hasard", id: "wheel-respin-3", name: "Encore un tour", description: "Tomber 3 fois de suite sur « relance »", tier: 3, stat: "wheel.respin.streak.best", target: 3, secret: true, group: "Roue du jour"});
add({category: "hasard", id: "wheel-30-days", name: "Rituel", description: "Lancer la roue 30 jours de suite", tier: 3, stat: "wheel.days.best", target: 30, group: "Roue du jour"});
// Tout le Hasard
steps({category: "hasard", stat: "bet.total", group: "Tout le Hasard"}, "bet-total", [[1000, 1], [10_000, 2], [100_000, 3], [1_000_000, 4], [10_000_000, 5, "Baleine"]],
    n => `${fmt(n)} misés`, n => `Miser ${fmt(n)} jetons au total sur les jeux du Hasard`);
add({category: "hasard", id: "casino-tour", name: "Tournée générale", description: "Jouer à tous les jeux du Hasard le même jour (Plinko, roulette, machines, blackjack, poker, Keno et roue)", tier: 2, stat: "casino.day.all", target: 1, group: "Tout le Hasard"});
add({category: "hasard", id: "casino-x100", name: "Gros coup", description: "Gagner au moins 100 fois sa mise en une seule fois", tier: 4, stat: "casino.x100", target: 1, group: "Tout le Hasard"});

// Une version de « la définition de la folie » par jeu : refaire exactement la même chose en espérant autre chose
add({category: "hasard", id: "madness-roulette-10", name: "La définition de la folie", description: "Poser exactement les mêmes jetons 10 tours de suite à la roulette et perdre à chaque fois", tier: 3, stat: "madness.roulette.best", target: 10, secret: true, group: "La folie"});
add({category: "hasard", id: "madness-roulette-25", name: "La définition de la folie II", description: "La même chose, 25 tours de suite", tier: 4, stat: "madness.roulette.best", target: 25, secret: true, group: "La folie"});
add({category: "hasard", id: "madness-roulette-50", name: "La définition de la folie III", description: "La même chose, 50 tours de suite", tier: 5, stat: "madness.roulette.best", target: 50, secret: true, group: "La folie"});
add({category: "hasard", id: "madness-keno", name: "Rechute", description: "Les mêmes numéros et la même mise au Keno, 10 tirages de suite sans le moindre gain", tier: 3, stat: "madness.keno.best", target: 10, secret: true, group: "La folie"});
add({category: "hasard", id: "madness-plinko", name: "Encore une fois, juste une", description: "Même mise, même tableau : 20 billes de suite sous ×1 au Plinko", tier: 3, stat: "madness.plinko.best", target: 20, secret: true, group: "La folie"});
add({category: "hasard", id: "madness-slots", name: "Ça va finir par tomber", description: "Même machine, même mise, mêmes lignes : 30 lancers de suite sans gain", tier: 3, stat: "madness.slots.best", target: 30, secret: true, group: "La folie"});
add({category: "hasard", id: "madness-blackjack", name: "Même méthode, même résultat", description: "Même mise et mêmes coups au blackjack, 10 mains perdues de suite", tier: 3, stat: "madness.blackjack.best", target: 10, secret: true, group: "La folie"});
add({category: "hasard", id: "madness-poker", name: "Jamais deux sans quinze", description: "Même mise et mêmes cartes gardées au poker, 15 mains de suite sans rien", tier: 3, stat: "madness.poker.best", target: 15, secret: true, group: "La folie"});

// ----- 8. Amis
steps({category: "social", stat: "friends", group: "Amis"}, "friends", [[1, 1, "Premier ami"], [5, 1], [10, 2], [25, 3, "Populaire"]],
    n => `${n} amis`, n => (n === 1 ? "Avoir un ami sur JokR" : `Avoir ${n} amis sur JokR`));
add({category: "social", id: "challenge-sent", name: "Défi lancé", description: "Défier un ami", tier: 1, stat: "challenges.sent", target: 1, group: "Défis"});
steps({category: "social", stat: "challenges.won", group: "Défis"}, "challenges-won", [[1, 1], [10, 2], [50, 3], [100, 4]],
    n => (n === 1 ? "Première victoire" : `${n} défis gagnés`), n => (n === 1 ? "Gagner un défi contre un ami" : `Gagner ${n} défis contre des amis`));
add({category: "social", id: "challenge-revenge", name: "Revanche", description: "Battre un ami qui t'avait battu", tier: 2, stat: "challenges.revenge", target: 1, group: "Défis"});
add({category: "social", id: "challenge-tie", name: "Égalité parfaite", description: "Faire exactement le même temps (à la seconde) qu'un ami sur un défi", tier: 4, stat: "challenges.tie", target: 1, secret: true, group: "Défis"});
add({category: "social", id: "feedback", name: "Contributeur", description: "Envoyer un retour (bug ou idée)", tier: 1, stat: "feedback", target: 1});

// ----- 9. Occasions (tous secrets)
const DATES: [string, string, string, AchievementTier][] = [
    ["christmas", "Joyeux Noël", "Jouer le 25 décembre", 2],
    ["newyear", "Bonne année", "Jouer le 1er janvier", 2],
    ["aprilfools", "Poisson d'avril", "Jouer le 1er avril", 2],
    ["friday13", "Vendredi 13", "Jouer un vendredi 13", 2],
    ["anniversary", "Joyeux anniversaire JokR", "Jouer le 10 octobre, jour de l'anniversaire du site", 3],
];
for (const [key, name, description, tier] of DATES) {
    add({category: "secrets", id: `date-${key}`, name, description, tier, stat: `date.${key}`, target: 1, secret: true});
}
add({category: "secrets", id: "anniversary-3", name: "Fidèle au poste", description: "Jouer le 10 octobre trois années différentes", tier: 5, stat: "date.anniversary.years", target: 3, secret: true});
add({category: "secrets", id: "midnight", name: "Minuit pile", description: "Être sur JokR à minuit pile", tier: 1, stat: "time.midnight", target: 1, secret: true});
add({category: "secrets", id: "login-7", name: "Habitué", description: "Venir sur JokR 7 jours de suite", tier: 1, stat: "login.streak.best", target: 7, secret: true});
add({category: "secrets", id: "marathon", name: "Marathon", description: "Passer 4 heures sur JokR dans la même journée", tier: 2, stat: "active.day.best", target: 240, secret: true});
add({category: "secrets", id: "comeback", name: "Retour aux sources", description: "Revenir après 30 jours sans jouer", tier: 1, stat: "comeback", target: 1, secret: true});

// ----- 10. Pas de chance (troll, presque tous secrets)
const troll = (id: string, name: string, description: string, tier: AchievementTier, stat: string, target = 1, group?: string, op: Achievement["op"] = "gte") =>
    add({category: "troll", id, name, description, tier, stat, target, op, secret: true, ...(group ? {group} : {})});
// Roulette
troll("roulette-zero-5", "Obstiné", "Miser 5 tours de suite sur le 0 et perdre à chaque fois", 2, "roulette.zeroloss.streak.best", 5, "Roulette");
troll("roulette-zero-20", "Vraiment obstiné", "Miser 20 tours de suite sur le 0 et perdre à chaque fois", 3, "roulette.zeroloss.streak.best", 20, "Roulette");
troll("roulette-both", "Indécis", "Miser sur le rouge et le noir dans le même tour", 1, "roulette.bothcolors", 1, "Roulette");
troll("roulette-accountant", "Comptable", "Miser sur les 37 numéros et repartir avec moins qu'au départ", 1, "roulette.accountant", 1, "Roulette");
troll("roulette-color-loss", "Ça devait sortir", "Perdre 10 tours de suite sur la même couleur", 2, "roulette.colorloss.streak.best", 10, "Roulette");
troll("roulette-big-loss", "Aïe", "Perdre plus de 10 000 jetons sur un seul tour", 3, "roulette.bigloss", 1, "Roulette");
// Plinko
troll("plinko-gravity", "Gravité", "10 billes de suite dans la case la plus basse", 2, "plinko.low.streak.best", 10, "Plinko");
troll("plinko-murphy", "Loi de Murphy", "100 billes de suite au tableau extrême sans jamais dépasser ×1", 3, "plinko.murphy.streak.best", 100, "Plinko");
troll("plinko-close", "À un cheveu", "La case juste à côté de la case maximale, au tableau extrême", 3, "plinko.nearedge", 1, "Plinko");
// Machines
troll("slots-drought", "Sécheresse", "50 lancers de suite sans le moindre gain", 3, "slots.loss.streak.best", 50, "Machines à sous");
troll("slots-near", "Si près", "4 jokers alignés sur 5 colonnes… et le 5e qui rate", 3, "slots.near", 1, "Machines à sous");
// Blackjack
troll("bj-greedy", "Gourmand", "Tirer une carte sur 20 et sauter", 2, "bj.greedy", 1, "Blackjack");
troll("bj-22", "22", "Sauter avec exactement 22", 1, "bj.22", 1, "Blackjack");
troll("bj-robbed", "Volé", "Avoir 20 et perdre contre un blackjack du croupier", 2, "bj.robbed", 1, "Blackjack");
troll("bj-kamikaze", "Kamikaze", "Sauter 5 mains de suite", 3, "bj.bust.streak.best", 5, "Blackjack");
troll("bj-coward", "Trop prudent", "Rester sur 11 ou moins et perdre", 1, "bj.coward", 1, "Blackjack");
// Poker
troll("poker-blind", "Confiance aveugle", "Garder les 5 cartes et finir sans rien", 1, "poker.blind", 1, "Poker");
troll("poker-aces-out", "Le grand ménage", "Jeter une paire d'as et finir sans rien", 2, "poker.acesout", 1, "Poker");
troll("poker-regret", "Regrets éternels", "Jeter une main qui payait déjà et finir sans rien", 2, "poker.regret", 1, "Poker");
troll("poker-inexcusable", "Inexcusable", "Recevoir une quinte flush royale d'entrée… et la casser", 5, "poker.inexcusable", 1, "Poker");
// Keno
troll("keno-zero-10", "Zéro pointé", "Aucun numéro trouvé avec 10 numéros cochés", 2, "keno.zero10", 1, "Keno");
troll("keno-zero-15", "Zéro pointé, édition deluxe", "Aucun numéro trouvé avec 15 numéros cochés", 3, "keno.zero15", 1, "Keno");
// Loterie, roue
troll("lottery-taxpayer", "Contribuable", "Avoir eu 1 000 tickets de loterie sans jamais gagner", 3, "lottery.tickets.nowin", 1000, "Loterie");
troll("lottery-favorite", "Favori déchu", "Avoir le plus de tickets d'un tirage et perdre", 3, "lottery.favorite", 1, "Loterie");
troll("wheel-stingy", "Radin", "Tomber 10 fois de suite sur la plus petite case de la roue", 2, "wheel.small.streak.best", 10, "Roue du jour");
// Tout le Hasard
troll("casino-unlucky", "Pas de chance", "Perdre 15 mises de suite au Hasard", 2, "casino.loss.streak.best", 15, "Tout le Hasard");
troll("casino-express", "Express", "Perdre 1 000 jetons en moins de 5 minutes", 2, "casino.express", 1, "Tout le Hasard");
troll("casino-icarus", "Icare", "Retomber sous 10 jetons après en avoir eu plus de 100 000", 4, "icarus", 1, "Tout le Hasard");
troll("casino-patron", "Mécène", "Perdre 100 000 jetons au total au Hasard", 3, "lost.total", 100_000, "Tout le Hasard");
troll("casino-house", "Le casino gagne toujours", "Perdre 1 000 000 jetons au total au Hasard", 5, "lost.total", 1_000_000, "Tout le Hasard");
troll("casino-addict", "Accro", "Passer une heure sur le Hasard sans toucher à un puzzle", 2, "casino.addict", 1, "Tout le Hasard");
// Défis du jour et puzzles
troll("daily-slow-1h", "Prendre son temps", "Mettre plus d'une heure à finir un défi du jour", 1, "daily.slowest", 3_600_000, "Défis du jour");
troll("daily-slow-3h", "Escargot", "Mettre plus de 3 heures à finir un défi du jour", 2, "daily.slowest", 10_800_000, "Défis du jour");
troll("daily-late", "Hors délai", "Commencer un défi du jour avant minuit et le finir après", 2, "daily.late", 1, "Défis du jour");
troll("daily-last", "Lanterne rouge", "Finir dernier du classement d'un défi du jour (3 joueurs au moins)", 2, "daily.lastplace", 1, "Défis du jour");
troll("daily-51", "Aux portes du top 50", "Finir exactement 51e d'un défi du jour", 2, "daily.rank51", 1, "Défis du jour");
troll("daily-so-close", "Si près du but", "Finir 2e d'un défi du jour à moins d'une seconde du 1er", 3, "daily.soclose", 1, "Défis du jour");
troll("daily-42", "La réponse", "Finir exactement 42e d'un défi du jour", 1, "daily.rank42", 1, "Défis du jour");
troll("puzzle-stubborn", "Têtu", "Envoyer 100 grilles fausses sur la même partie", 2, "puzzle.failed.best", 100, "Puzzles");
troll("rules-20", "Pas lu les règles", "Ouvrir les règles d'un même jeu 20 fois", 1, "rules.best", 20, "Puzzles");
// Solde
troll("balance-777", "Jackpot !", "Avoir exactement 777 jetons", 2, "credits", 777, "Solde", "eq");
troll("balance-666", "Diabolique", "Avoir exactement 666 jetons", 2, "credits", 666, "Solde", "eq");
troll("balance-1337", "Leet", "Avoir exactement 1 337 jetons", 2, "credits", 1337, "Solde", "eq");
troll("balance-1m", "Pile ou face", "Avoir exactement 1 000 000 jetons", 5, "credits", 1_000_000, "Solde", "eq");
// Profil, amis
troll("background-20", "Décorateur indécis", "Changer de fond 20 fois dans la même journée", 2, "background.day.best", 20, "Profil");
troll("avatar-10", "Caméléon", "Changer d'avatar 10 fois dans la même journée", 1, "avatar.day.best", 10, "Profil");
troll("challenge-punching-bag", "Souffre-douleur", "Perdre 10 défis contre le même ami", 2, "challenges.lostvs.max", 10, "Amis");

// ----- 11. Collection
const META_TARGETS: [number, AchievementTier][] = [[10, 1], [50, 2], [100, 3], [200, 4], [300, 4]];
for (const [n, tier] of META_TARGETS) {
    add({category: "meta", id: `meta-${n}`, name: `${n} succès`, description: `Débloquer ${n} succès`, tier, stat: "achievements.count", target: n});
}
// tous les autres (calculé une fois la liste finie)
add({category: "meta", id: "meta-all", name: "Platine", description: "Débloquer tous les autres succès", tier: 5, stat: "achievements.count", target: list.length});

export const ACHIEVEMENTS: readonly Achievement[] = list;
export const achievement = (id: string): Achievement | undefined => ACHIEVEMENTS.find(a => a.id === id);

// Succès qui regardent chaque statistique
export const ACHIEVEMENTS_BY_STAT: ReadonlyMap<string, readonly Achievement[]> = (() => {
    const map = new Map<string, Achievement[]>();
    for (const a of ACHIEVEMENTS) map.set(a.stat, [...map.get(a.stat) ?? [], a]);
    return map;
})();

export const achievementReward = (a: Achievement) => ACHIEVEMENT_REWARDS[a.tier];

// Condition remplie pour cette valeur de la statistique
export function achievementMet(a: Achievement, value: number | undefined): boolean {
    if (value === undefined) return false;
    if (a.op === "lte") return value <= a.target;
    if (a.op === "eq") return value === a.target;
    return value >= a.target;
}

// Avancement de 0 à 1 (barre de la page) ; null : pas de barre (secret, cible unique, place, temps, solde exact)
export function achievementProgress(a: Achievement, value: number | undefined): number | null {
    if (a.secret || a.op !== "gte" || a.target <= 1) return null;
    return Math.max(0, Math.min(1, (value ?? 0) / a.target));
}
