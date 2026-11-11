/*
 * Plinko : plateau, physique et gains. Fichier partagé : le serveur l'utilise pour tirer la chute et
 * payer, le site l'importe tel quel pour rejouer la même chute à l'écran (backend/src/utils/plinko.ts).
 *
 * La chute est une vraie simulation physique (gravité, rebonds sur les clous avec perte d'énergie,
 * frottement) à pas de temps fixe. Elle est entièrement déterminée par une graine : même graine,
 * même chute, au pixel près, sur le serveur comme dans le navigateur (que des + - * / et Math.sqrt,
 * exacts partout ; pas de Math.random ni de sin/cos).
 *
 * Pas d'import ici : le fichier doit rester utilisable tel quel des deux côtés.
 */

// ---------- Plateau (unités du plateau, le site met à l'échelle)
export const PLINKO_ROWS = 12;
export const PLINKO_SPACING = 40; // écart entre deux clous d'une rangée
export const PLINKO_ROW_HEIGHT = 36; // écart entre deux rangées
export const PLINKO_PEG_RADIUS = 5;
export const PLINKO_BALL_RADIUS = 9;
export const PLINKO_WIDTH = (PLINKO_ROWS + 3) * PLINKO_SPACING;
const TOP = 70; // hauteur de la première rangée
export const PLINKO_BOTTOM = TOP + (PLINKO_ROWS - 1) * PLINKO_ROW_HEIGHT; // dernière rangée
export const PLINKO_HEIGHT = PLINKO_BOTTOM + 62; // place pour les cases sous la dernière rangée
const CENTER = PLINKO_WIDTH / 2;

export type Point = { x: number; y: number };
export type Segment = { a: Point; b: Point };

// Clous : la rangée r en compte r + 3, centrés
export const PLINKO_PEGS: Point[] = [];
for (let r = 0; r < PLINKO_ROWS; r++) {
    for (let i = 0; i < r + 3; i++) {
        PLINKO_PEGS.push({x: CENTER + (i - (r + 2) / 2) * PLINKO_SPACING, y: TOP + r * PLINKO_ROW_HEIGHT});
    }
}

// Dernière rangée : les cases sont entre deux clous voisins (13 cases pour 14 clous)
export const PLINKO_SLOTS = PLINKO_ROWS + 1;
const firstBottomX = CENTER - (PLINKO_ROWS + 1) / 2 * PLINKO_SPACING;
export const slotCenterX = (slot: number) => firstBottomX + (slot + 0.5) * PLINKO_SPACING;

// Bords : deux parois obliques au ras des clous du bord, comme sur un vrai plateau
// (pas de passage ni de recoin entre la paroi et un clou : la bille reste sur le plateau sans se coincer)
const edgeX = (row: number) => (row + 2) / 2 * PLINKO_SPACING + PLINKO_PEG_RADIUS;
const edge = (side: -1 | 1): Segment => ({
    a: {x: CENTER + side * edgeX(-1), y: TOP - PLINKO_ROW_HEIGHT},
    b: {x: CENTER + side * edgeX(PLINKO_ROWS - 1), y: PLINKO_BOTTOM},
});
export const PLINKO_WALLS: Segment[] = [edge(-1), edge(1)];

// ---------- Gains : multiplicateur de la mise selon la case (bords rares et gros, centre fréquent et petit).
// Trois tableaux au choix du joueur, sur le même plateau (mêmes chances par case) :
// - low (prudent) : petits multiplicateurs, une bille sur deux gagne un peu
// - medium (équilibré) : le tableau d'origine
// - high (risqué) : ×25 aux bords mais ×0,1 au centre, il faut toucher les bords pour gagner
// Calibrés par simulation (voir plinko.test.ts) pour rendre tous environ 96 % des mises sur la durée.
const half = (edgeToCenter: number[]) => [...edgeToCenter, ...edgeToCenter.slice(0, -1).reverse()];
export const PLINKO_TABLES = {
    low: half([2, 1.3, 1.2, 1.1, 1.1, 0.8, 0.7]),
    medium: half([10, 4, 2, 1.1, 0.7, 0.5, 0.3]),
    high: half([25, 6, 2.5, 0.7, 0.3, 0.2, 0.1]),
} as const satisfies Record<string, number[]>;

export type PlinkoRisk = keyof typeof PLINKO_TABLES;
export const PLINKO_RISKS = ["low", "medium", "high"] as const satisfies readonly PlinkoRisk[];
export const DEFAULT_PLINKO_RISK: PlinkoRisk = "medium";
export const isPlinkoRisk = (risk: unknown): risk is PlinkoRisk => PLINKO_RISKS.includes(risk as PlinkoRisk);

// Tableau d'origine (équilibré)
export const PLINKO_MULTIPLIERS = PLINKO_TABLES.medium;

// Plus gros multiplicateur, tous tableaux confondus
export const PLINKO_MAX_MULTIPLIER = Math.max(...PLINKO_RISKS.flatMap(r => PLINKO_TABLES[r]));

// Chance d'arriver dans chaque case, en % (mesurée sur 200 000 chutes simulées, arrondie ; à refaire si la
// physique ou le plateau changent, voir plinko.test.ts)
export const PLINKO_ODDS = [0.6, 1.7, 4, 7.6, 12, 15.5, 17, 15.5, 12, 7.6, 4, 1.7, 0.6] as const;

// Part des mises rendue sur la durée (mesurée sur 100 000 chutes, la même pour les trois tableaux à 1 point près)
export const PLINKO_RTP = 0.96;

export const plinkoMultiplier = (slot: number, risk: PlinkoRisk = DEFAULT_PLINKO_RISK) => PLINKO_TABLES[risk][slot]!;

// Gain en crédits pour une mise et une case. Les mises sont des multiples de 10 et les multiplicateurs ont
// une décimale : le gain tombe toujours juste (Math.round ne corrige que les erreurs d'arrondi des flottants).
export const plinkoPayout = (bet: number, slot: number, risk: PlinkoRisk = DEFAULT_PLINKO_RISK) =>
    Math.round(bet * plinkoMultiplier(slot, risk));

export const PLINKO_BETS = [10, 20, 50, 100, 200, 500] as const;
export const isPlinkoBet = (bet: unknown): bet is number => PLINKO_BETS.includes(bet as typeof PLINKO_BETS[number]);

// ---------- Physique
const GRAVITY = 1600; // unités / s²
const STEP = 1 / 240; // pas de temps fixe
const RESTITUTION = 0.3; // part de la vitesse gardée au rebond
const FRICTION = 0.8; // part de la vitesse le long du clou gardée au contact
const MAX_SPEED = 900; // la bille n'avance jamais de plus de 4 unités par pas : pas de traversée de clou
const IMPACT = 40; // en dessous, la bille roule sur le clou au lieu de rebondir
const HARD_IMPACT = 150;
const JITTER = 30; // petites imperfections au contact (clous et bille jamais parfaits)
const MAX_STEPS = 240 * 30;
const STALL_STEPS = 240; // une seconde sans descendre : la bille est posée en équilibre sur un clou
const NUDGE = 60; // petite poussée vers le côté où elle penche (on secoue le plateau)
const FRAME_EVERY = 4; // une position enregistrée tous les 4 pas : 60 images par seconde

// Générateur pseudo-aléatoire déterministe (mulberry32) : entiers 32 bits seulement
function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export type PlinkoDrop = {
    slot: number;
    // positions de la bille, 60 par seconde (pour l'animation)
    frames: Point[];
    // images où la bille touche un clou (pour l'allumer)
    hits: { frame: number; peg: number }[];
};

// Repousse la bille hors d'un obstacle (point le plus proche `c`) et fait rebondir sa vitesse
function collide(p: Point, v: Point, c: Point, minDist: number, random: () => number): boolean {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= minDist * minDist) return false;
    const d = Math.sqrt(d2);
    // centre exactement sur l'obstacle (quasi impossible) : on repart vers le haut
    const nx = d > 1e-9 ? dx / d : 0;
    const ny = d > 1e-9 ? dy / d : -1;
    p.x = c.x + nx * minDist;
    p.y = c.y + ny * minDist;
    const vn = v.x * nx + v.y * ny;
    if (vn < -IMPACT) {
        // choc : vitesse normale renvoyée (amortie), vitesse tangente freinée, petite imperfection
        const tx = v.x - vn * nx;
        const ty = v.y - vn * ny;
        // frottement seulement sur un choc franc : une bille qui tapote un clou glisse quand même sur le côté
        const friction = vn < -HARD_IMPACT ? FRICTION : 1;
        v.x = tx * friction - vn * RESTITUTION * nx + (random() - 0.5) * JITTER;
        v.y = ty * friction - vn * RESTITUTION * ny;
    } else if (vn < 0) {
        // simple appui (la bille roule sur le clou) : on retire seulement la vitesse qui rentre dans le clou
        v.x -= vn * nx;
        v.y -= vn * ny;
    }
    return true;
}

function closestOnSegment(p: Point, {a, b}: Segment): Point {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return {x: a.x + t * abx, y: a.y + t * aby};
}

function nearestPeg(p: Point): Point {
    let best = PLINKO_PEGS[0]!;
    let bestD = Infinity;
    for (const peg of PLINKO_PEGS) {
        const d = (peg.x - p.x) * (peg.x - p.x) + (peg.y - p.y) * (peg.y - p.y);
        if (d < bestD) {
            bestD = d;
            best = peg;
        }
    }
    return best;
}

// Simule la chute d'une bille à partir d'une graine (entier 32 bits)
export function simulatePlinko(seed: number): PlinkoDrop {
    const random = rng(seed);
    // lâchée en haut, un peu à gauche ou à droite du centre, avec une petite vitesse de côté
    const p: Point = {x: CENTER + (random() - 0.5) * PLINKO_SPACING * 0.5, y: TOP - 2 * PLINKO_ROW_HEIGHT + PLINKO_BALL_RADIUS};
    const v: Point = {x: (random() - 0.5) * 40, y: 0};
    const frames: Point[] = [{x: p.x, y: p.y}];
    const hits: PlinkoDrop["hits"] = [];
    const minPeg = PLINKO_PEG_RADIUS + PLINKO_BALL_RADIUS;
    const end = PLINKO_BOTTOM + PLINKO_ROW_HEIGHT;

    let lowest = p.y;
    let lowestStep = 0;
    for (let step = 1; step <= MAX_STEPS && p.y < end; step++) {
        if (p.y > lowest + 1) {
            lowest = p.y;
            lowestStep = step;
        } else if (step - lowestStep > STALL_STEPS) {
            const peg = nearestPeg(p);
            const side = p.x > peg.x ? 1 : p.x < peg.x ? -1 : (random() < 0.5 ? -1 : 1);
            v.x += side * NUDGE;
            lowestStep = step;
        }

        v.y += GRAVITY * STEP;
        const speed = Math.sqrt(v.x * v.x + v.y * v.y);
        if (speed > MAX_SPEED) {
            v.x = v.x / speed * MAX_SPEED;
            v.y = v.y / speed * MAX_SPEED;
        }
        p.x += v.x * STEP;
        p.y += v.y * STEP;

        // seuls les clous des rangées voisines peuvent être touchés
        const row = Math.round((p.y - TOP) / PLINKO_ROW_HEIGHT);
        for (let r = row - 1; r <= row + 1; r++) {
            if (r < 0 || r >= PLINKO_ROWS) continue;
            const first = r * (r + 5) / 2; // nombre de clous des rangées au-dessus
            for (let i = first; i < first + r + 3; i++) {
                if (collide(p, v, PLINKO_PEGS[i]!, minPeg, random)) {
                    const frame = Math.ceil(step / FRAME_EVERY);
                    const last = hits[hits.length - 1];
                    if (!last || last.peg !== i || frame - last.frame > 6) hits.push({frame, peg: i});
                }
            }
        }
        for (const wall of PLINKO_WALLS) collide(p, v, closestOnSegment(p, wall), PLINKO_BALL_RADIUS, random);

        if (step % FRAME_EVERY === 0) frames.push({x: p.x, y: p.y});
    }
    frames.push({x: p.x, y: p.y});

    const slot = Math.floor((p.x - firstBottomX) / PLINKO_SPACING);
    return {slot: slot < 0 ? 0 : slot >= PLINKO_SLOTS ? PLINKO_SLOTS - 1 : slot, frames, hits};
}
