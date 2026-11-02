import {useState} from "react";

export type BarSegment = { key: string; label: string; value: number; color: string };

export type Bar = {
    label: string;
    // Libellé complet dans l'infobulle (sinon `label`)
    title?: string;
    value: number;
    // Barre empilée (une couleur par jeu) ; sinon une seule couleur
    segments?: BarSegment[];
};

type BarChartProps = {
    bars: Bar[];
    // Couleur d'une barre simple
    color?: string;
    // N'affiche qu'un libellé sur n sous l'axe (beaucoup de barres)
    labelEvery?: number;
    // Description pour les lecteurs d'écran
    ariaLabel: string;
};

/**
 * Histogramme en barres verticales, simple ou empilé, avec une infobulle au survol (ou au toucher).
 * Les barres partent de zéro ; seule la valeur maximale est indiquée sur l'axe.
 */
export default function BarChart({bars, color = "#94a3b8", labelEvery = 1, ariaLabel}: BarChartProps) {
    const [hovered, setHovered] = useState<number | null>(null);
    const max = Math.max(1, ...bars.map(b => b.value));
    const current = hovered !== null ? bars[hovered] : null;

    return (
        <div className="bar-chart" role="img" aria-label={ariaLabel} onMouseLeave={() => setHovered(null)}>
            <div className="bar-chart-tooltip" aria-hidden>
                {current ? (
                    <>
                        <strong>{current.title ?? current.label}</strong> · {current.value}
                        {current.segments && current.segments.filter(s => s.value > 0).map(s => (
                            <span key={s.key} className="bar-chart-tooltip-item">
                                <i style={{background: s.color}}/>{s.label} {s.value}
                            </span>
                        ))}
                    </>
                ) : <span className="bar-chart-hint">Survole une barre pour le détail</span>}
            </div>

            <div className="bar-chart-plot">
                <span className="bar-chart-max">{max}</span>
                {bars.map((bar, i) => (
                    <div key={bar.label + i} className={`bar-chart-col ${hovered === i ? "hovered" : ""}`}
                         onMouseEnter={() => setHovered(i)} onClick={() => setHovered(i)}>
                        <div className="bar-chart-bar" style={{height: `${(bar.value / max) * 100}%`}}>
                            {bar.segments
                                ? bar.segments.filter(s => s.value > 0).map(s => (
                                    <div key={s.key} className="bar-chart-segment"
                                         style={{flexGrow: s.value, background: s.color}}/>
                                ))
                                : bar.value > 0 && <div className="bar-chart-segment" style={{flexGrow: 1, background: color}}/>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bar-chart-labels" aria-hidden>
                {bars.map((bar, i) => (
                    <span key={bar.label + i}>{i % labelEvery === 0 ? bar.label : ""}</span>
                ))}
            </div>
        </div>
    );
}
