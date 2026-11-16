type ErrorsToggleProps = {
    checked: boolean;
    onChange: (value: boolean) => void;
    // Nombre de cases en conflit (affiché quand l'option est active)
    count: number;
};

/**
 * Case à cocher « Montrer les coups interdits » du panneau Actions : signale en rouge ce qui enfreint déjà une règle
 * (deux fois le même chiffre dans une ligne, deux dames qui se touchent…). Elle ne dit pas si une case est bien
 * placée par rapport à la solution : le navigateur ne la connaît pas.
 */
export default function ErrorsToggle({checked, onChange, count}: ErrorsToggleProps) {
    return (
        <div className="errors-toggle-block">
            <label className="errors-toggle" title="Signale en rouge ce qui enfreint une règle, pas une case mal placée">
                <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>
                <span>Montrer les coups interdits</span>
                {checked && count > 0 && <span className="errors-count">{count}</span>}
            </label>
            <p className="errors-hint">Ce qui enfreint une règle s'affiche en rouge. Une case mal placée mais permise n'est pas signalée.</p>
        </div>
    );
}
