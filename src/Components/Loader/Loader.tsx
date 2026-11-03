import "./Loader.scss";

/**
 * Indicateur de chargement : trois cases de grille qui sautent l'une après l'autre, et un texte.
 * Il apparaît avec un léger retard : un chargement très court ne le fait pas clignoter.
 * - label : texte sous les cases ("Chargement…" par défaut)
 * - size : "small" dans une popup ou un encart, "normal" pour une page
 */
type LoaderProps = {
    label?: string;
    size?: "small" | "normal";
    className?: string;
};

export default function Loader({label = "Chargement…", size = "normal", className = ""}: LoaderProps) {
    return (
        <div className={`loader loader-${size} ${className}`} role="status" aria-live="polite">
            <div className="loader-cells" aria-hidden="true">
                <span/>
                <span/>
                <span/>
            </div>
            <p className="loader-label">{label}</p>
        </div>
    );
}
