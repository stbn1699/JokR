/*
 * Calculs de la visite guidée (sans React ni DOM, pour être testés) : où poser la bulle autour des éléments
 * montrés, d'où à où tracer la flèche, et le souvenir « visite déjà proposée » dans le navigateur.
 */

export type Rect = { top: number; left: number; width: number; height: number };
export type Point = { x: number; y: number };

// marge entre le bord de l'écran et la bulle, et place laissée à la flèche entre la bulle et l'élément
export const EDGE = 12;
export const GAP = 44;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, Math.max(min, max)));

// Le plus petit rectangle qui contient tous les éléments montrés
export function unionRect(rects: Rect[]): Rect {
    const top = Math.min(...rects.map(r => r.top)), left = Math.min(...rects.map(r => r.left));
    const bottom = Math.max(...rects.map(r => r.top + r.height)), right = Math.max(...rects.map(r => r.left + r.width));
    return {top, left, width: right - left, height: bottom - top};
}

/**
 * Position de la bulle (taille `bubble`) : sous les éléments s'il y a la place, sinon au-dessus, sinon à côté,
 * sinon par-dessus, en haut ou en bas de l'écran (pas de flèche vers les éléments qu'elle recouvre).
 * `target` englobe les éléments `holes` (tous si omis).
 */
export function placeBubble(target: Rect, bubble: { width: number; height: number }, view: { width: number; height: number },
                            holes: Rect[] = [target]): Rect {
    const {width: w, height: h} = bubble;
    const below = view.height - (target.top + target.height), above = target.top;
    const right = view.width - (target.left + target.width), left = target.left;
    const centeredLeft = clamp(target.left + target.width / 2 - w / 2, EDGE, view.width - w - EDGE);
    const centeredTop = clamp(target.top + target.height / 2 - h / 2, EDGE, view.height - h - EDGE);

    if (below >= h + GAP + EDGE) return {top: target.top + target.height + GAP, left: centeredLeft, width: w, height: h};
    if (above >= h + GAP + EDGE) return {top: target.top - GAP - h, left: centeredLeft, width: w, height: h};
    if (right >= w + GAP + EDGE) return {top: centeredTop, left: target.left + target.width + GAP, width: w, height: h};
    if (left >= w + GAP + EDGE) return {top: centeredTop, left: target.left - GAP - w, width: w, height: h};
    // pas de place : en haut ou en bas de l'écran, là où la bulle cache le moins des éléments (en haut à égalité)
    const atTop = {top: EDGE, left: centeredLeft, width: w, height: h};
    const atBottom = {top: view.height - h - EDGE, left: centeredLeft, width: w, height: h};
    const hidden = (b: Rect) => holes.reduce((sum, r) => sum + overlapArea(b, r), 0);
    return hidden(atBottom) < hidden(atTop) ? atBottom : atTop;
}

function overlapArea(a: Rect, b: Rect): number {
    const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
    const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
}

const center = (r: Rect): Point => ({x: r.left + r.width / 2, y: r.top + r.height / 2});

// Point du bord du rectangle sur la droite qui va de son centre vers `toward`
export function edgePoint(r: Rect, toward: Point): Point {
    const c = center(r);
    const dx = toward.x - c.x, dy = toward.y - c.y;
    if (dx === 0 && dy === 0) return c;
    const scale = Math.min(dx ? r.width / 2 / Math.abs(dx) : Infinity, dy ? r.height / 2 / Math.abs(dy) : Infinity);
    return {x: c.x + dx * scale, y: c.y + dy * scale};
}

const overlap = (a: Rect, b: Rect) =>
    a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

// Flèche de la bulle vers un élément : d'un bord à l'autre ; aucune si la bulle est posée par-dessus
export function arrowBetween(bubble: Rect, target: Rect): { from: Point; to: Point } | null {
    if (overlap(bubble, target)) return null;
    return {from: edgePoint(bubble, center(target)), to: edgePoint(target, center(bubble))};
}

/**
 * Une seule flèche, vers l'élément le plus proche de la bulle : avec plusieurs flèches, celles qui vont aux
 * éléments du fond traversent ceux de devant. Les éléments montrés ensemble sont voisins, le cadre suffit.
 */
export function nearestArrow(bubble: Rect, targets: Rect[]): { from: Point; to: Point } | null {
    const length = (a: { from: Point; to: Point }) => Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y);
    return targets.map(t => arrowBetween(bubble, t))
        .filter(a => a !== null)
        .reduce<{ from: Point; to: Point } | null>((best, a) => (best && length(best) <= length(a) ? best : a), null);
}

// Souvenir, par jeu, que la visite a été proposée (acceptée ou non)
export const tourKey = (code: string) => `jokr:tour:${code}`;

export function tourSeen(code: string): boolean {
    try {
        return localStorage.getItem(tourKey(code)) !== null;
    } catch {
        // stockage indisponible : on ne propose pas (sinon la question reviendrait à chaque visite)
        return true;
    }
}

export function markTourSeen(code: string) {
    try {
        localStorage.setItem(tourKey(code), "1");
    } catch {
        // stockage indisponible : rien à retenir
    }
}
