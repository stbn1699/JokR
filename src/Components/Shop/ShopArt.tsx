/**
 * Petits dessins des vignettes de la boutique : mosaïque d'une collection, rouleaux de machine à sous.
 */

// Image d'une collection : quelques objets côte à côte, en bandes
export function Mosaic({layers, grid = false}: { layers: string[]; grid?: boolean }) {
    return (
        <span className={`shop-art-mosaic ${grid ? "grid" : ""}`} aria-hidden>
            {layers.map((background, i) => <span key={i} style={{background}}/>)}
        </span>
    );
}

// Petits rouleaux de machine à sous (vignettes des améliorations)
const REEL_SYMBOLS = ["7", "★", "♦", "♣", "♥"];

export function Reels({columns, mini = false}: { columns: number; mini?: boolean }) {
    return (
        <span className={`shop-art-reels ${mini ? "mini" : ""}`} aria-hidden>
            {Array.from({length: columns}, (_, c) => (
                <span key={c} className="reel">
                    {[0, 1, 2].map(r => <span key={r}>{mini ? "" : REEL_SYMBOLS[(c * 2 + r) % REEL_SYMBOLS.length]}</span>)}
                </span>
            ))}
        </span>
    );
}
