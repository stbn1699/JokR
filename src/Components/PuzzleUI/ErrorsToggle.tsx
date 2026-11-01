type ErrorsToggleProps = {
    checked: boolean;
    onChange: (value: boolean) => void;
    // Nombre de cases en conflit (affiché quand l'option est active)
    count: number;
};

// Case à cocher "Montrer les erreurs" du panneau Actions
export default function ErrorsToggle({checked, onChange, count}: ErrorsToggleProps) {
    return (
        <label className="errors-toggle">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>
            <span>Montrer les erreurs</span>
            {checked && count > 0 && <span className="errors-count">{count}</span>}
        </label>
    );
}
