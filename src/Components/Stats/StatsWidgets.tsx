// Petits éléments de la page Statistiques : tuile d'un chiffre clé, légende de couleurs

export function Tile({label, value, detail}: { label: string; value: string; detail: string }) {
    return (
        <div className="stats-tile">
            <span className="stats-tile-label">{label}</span>
            <strong className="stats-tile-value">{value}</strong>
            <span className="stats-tile-detail">{detail}</span>
        </div>
    );
}

export function Legend({items}: { items: { label: string; color: string }[] }) {
    return (
        <ul className="stats-legend">
            {items.map(i => <li key={i.label}><i className="stats-dot" style={{background: i.color}}/>{i.label}</li>)}
        </ul>
    );
}
