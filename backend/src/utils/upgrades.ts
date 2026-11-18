/*
 * Améliorations de la boutique : ce qui change le jeu lui-même (plus de colonnes aux machines à sous, des tableaux
 * de Plinko plus risqués…). Chaque amélioration a plusieurs niveaux, achetés l'un après l'autre : le niveau 2 des
 * colonnes demande d'avoir le niveau 1. Fichier partagé : le serveur vérifie ce que le joueur a le droit de faire,
 * le site montre les niveaux dans la boutique et verrouille les choix dans les jeux.
 *
 * Un niveau acheté est un objet de la boutique (user_items) : « upgrade-<amélioration>-<niveau> ». Le niveau d'un
 * joueur est le nombre de niveaux qu'il a à la suite depuis le premier (0 : rien d'acheté, la valeur de base).
 * En mode admin, tout est débloqué.
 *
 * Pas d'import ici : le fichier doit rester utilisable tel quel des deux côtés.
 */

export type UpgradeGame = "slots" | "plinko" | "keno" | "roulette" | "lottery" | "wheel" | "shop";

export type UpgradeLevel = { value: number; label: string; price: number };

export type Upgrade = {
    id: string;
    game: UpgradeGame;
    name: string;
    description: string;
    // sans rien acheter
    base: { value: number; label: string };
    // niveaux à acheter, dans l'ordre
    levels: UpgradeLevel[];
};

export const UPGRADES: Upgrade[] = [
    {
        id: "slots-reels", game: "slots", name: "Colonnes",
        description: "Plus de rouleaux sur les machines à sous : des lignes plus longues et de plus gros gains.",
        base: {value: 3, label: "3 colonnes"},
        levels: [{value: 4, label: "4 colonnes", price: 300}, {value: 5, label: "5 colonnes", price: 800}],
    },
    {
        id: "slots-lines", game: "slots", name: "Lignes de gain",
        description: "Joue sur plus de lignes à la fois : la mise est partagée entre elles, les gains tombent plus souvent.",
        base: {value: 1, label: "1 ligne"},
        levels: [
            {value: 3, label: "3 lignes", price: 150},
            {value: 5, label: "5 lignes", price: 400},
            {value: 10, label: "10 lignes", price: 1000},
        ],
    },
    {
        id: "slots-auto", game: "slots", name: "Lancers en série",
        description: "Lance les rouleaux plus de fois d'affilée, sans cliquer à chaque fois.",
        base: {value: 10, label: "Jusqu'à 10 lancers"},
        levels: [
            {value: 25, label: "25 lancers", price: 200},
            {value: 50, label: "50 lancers", price: 500},
            {value: 100, label: "100 lancers", price: 1200},
        ],
    },
    {
        id: "plinko-risk", game: "plinko", name: "Difficulté",
        description: "Des tableaux de gains plus risqués : le centre paie moins, les bords beaucoup plus.",
        // valeur : nombre de tableaux débloqués, dans l'ordre de PLINKO_RISKS (prudent, équilibré, risqué, extrême)
        base: {value: 1, label: "Prudent"},
        levels: [
            {value: 2, label: "Équilibré", price: 250},
            {value: 3, label: "Risqué", price: 600},
            {value: 4, label: "Extrême", price: 1500},
        ],
    },
    {
        id: "plinko-balls", game: "plinko", name: "Billes par lancer",
        description: "Lâche plus de billes d'un coup.",
        base: {value: 5, label: "Jusqu'à 5 billes"},
        levels: [
            {value: 10, label: "10 billes", price: 150},
            {value: 25, label: "25 billes", price: 400},
            {value: 50, label: "50 billes", price: 900},
            {value: 100, label: "100 billes", price: 2000},
        ],
    },
    {
        id: "keno-picks", game: "keno", name: "Numéros cochés",
        description: "Coche plus de numéros sur la grille : des gains plus rares, mais bien plus gros.",
        base: {value: 10, label: "10 numéros"},
        levels: [{value: 12, label: "12 numéros", price: 400}, {value: 15, label: "15 numéros", price: 1000}],
    },
    {
        id: "roulette-case", game: "roulette", name: "Mise par case",
        description: "Pose plus de crédits sur une même case de la roulette.",
        base: {value: 2000, label: "2 000 crédits"},
        levels: [
            {value: 3000, label: "3 000 crédits", price: 500},
            {value: 5000, label: "5 000 crédits", price: 1500},
            {value: 10000, label: "10 000 crédits", price: 4000},
        ],
    },
    {
        id: "roulette-total", game: "roulette", name: "Mise par tour",
        description: "Mise plus de crédits en tout sur un tour de roulette.",
        base: {value: 10000, label: "10 000 crédits"},
        levels: [{value: 20000, label: "20 000 crédits", price: 1500}, {value: 50000, label: "50 000 crédits", price: 5000}],
    },
    {
        id: "lottery-ticket", game: "lottery", name: "Prix du ticket",
        description: "Moins de crédits misés pour chaque ticket de loterie : plus de tickets pour la même mise.",
        base: {value: 10, label: "1 ticket pour 10 crédits"},
        levels: [
            {value: 9, label: "1 ticket pour 9 crédits", price: 500},
            {value: 8, label: "1 ticket pour 8 crédits", price: 1500},
            {value: 7, label: "1 ticket pour 7 crédits", price: 4000},
        ],
    },
    {
        id: "wheel-spins", game: "wheel", name: "Tours de roue",
        description: "Lance la roue du jour plus d'une fois par jour.",
        base: {value: 1, label: "1 tour par jour"},
        levels: [{value: 2, label: "2 tours par jour", price: 1000}, {value: 3, label: "3 tours par jour", price: 3000}],
    },
    {
        id: "shop-discount", game: "shop", name: "Remise",
        description: "Une remise sur tous les cosmétiques de la boutique (pas sur les améliorations).",
        base: {value: 0, label: "Pas de remise"},
        levels: [
            {value: 5, label: "−5 %", price: 800},
            {value: 10, label: "−10 %", price: 2000},
            {value: 15, label: "−15 %", price: 5000},
        ],
    },
];

export const upgrade = (id: string): Upgrade | undefined => UPGRADES.find(u => u.id === id);

// Identifiant d'un niveau acheté (objet de la boutique)
export const upgradeItemId = (id: string, level: number) => `upgrade-${id}-${level}`;

// Niveau d'amélioration d'un identifiant d'objet (« upgrade-slots-reels-2 »), undefined : pas une amélioration
export function upgradeItem(itemId: unknown): { upgrade: Upgrade; level: number; price: number } | undefined {
    if (typeof itemId !== "string") return undefined;
    const match = /^upgrade-([a-z-]+)-(\d+)$/.exec(itemId);
    if (!match) return undefined;
    const u = upgrade(match[1]!);
    const level = Number(match[2]);
    const info = u?.levels[level - 1];
    return u && info ? {upgrade: u, level, price: info.price} : undefined;
}

export type UpgradeLevels = Record<string, number>;

// Niveaux d'un joueur d'après ses objets : pour chaque amélioration, les niveaux possédés à la suite depuis le premier
export function upgradeLevels(owned: Iterable<string>): UpgradeLevels {
    const set = new Set(owned);
    return Object.fromEntries(UPGRADES.map(u => {
        let level = 0;
        while (level < u.levels.length && set.has(upgradeItemId(u.id, level + 1))) level++;
        return [u.id, level];
    }));
}

// Tout débloqué (mode admin)
export const MAX_UPGRADES: UpgradeLevels = Object.fromEntries(UPGRADES.map(u => [u.id, u.levels.length]));

// Valeur d'une amélioration à un niveau (0 : la valeur de base)
export function upgradeValue(id: string, level: number): number {
    const u = upgrade(id);
    if (!u) throw new Error(`Amélioration inconnue : ${id}`);
    return level <= 0 ? u.base.value : u.levels[Math.min(level, u.levels.length) - 1]!.value;
}

// Valeur d'une amélioration pour un joueur
export const upgradeValueFor = (levels: UpgradeLevels, id: string) => upgradeValue(id, levels[id] ?? 0);

// Remise de la boutique : prix d'un cosmétique pour un joueur (arrondi au crédit, jamais gratuit s'il était payant)
export function discountedPrice(price: number, levels: UpgradeLevels): number {
    const percent = upgradeValueFor(levels, "shop-discount");
    return price <= 0 || percent === 0 ? price : Math.max(1, Math.round(price * (100 - percent) / 100));
}
