import {FaTimes} from "react-icons/fa";
import {fromLocalInput, hasPeriod, type Preset, PRESETS, type StatsFilter, toLocalInput} from "./statsFilter.ts";

/**
 * Barre de filtres de la page Statistiques : période (raccourcis, ou début et fin à la minute près) et jeu.
 * `games` : jeux proposés dans le choix du jeu (null : pas de choix de jeu, ex. la boutique).
 */
export default function StatsFilters({value, games, onChange}: {
    value: StatsFilter;
    games: { code: string; name: string }[] | null;
    onChange: (next: StatsFilter) => void;
}) {
    const custom = value.preset === null && (value.from !== null || value.to !== null);
    const setPreset = (preset: Preset | null) => onChange({...value, preset, from: null, to: null});
    // Début ou fin choisis à la main : la période devient personnalisée (on part du raccourci en cours s'il y en a un)
    const setBound = (key: "from" | "to", input: string) => {
        const base = value.preset ? {from: new Date(Date.now() - PRESETS[value.preset].ms).toISOString(), to: null} : value;
        onChange({...value, preset: null, from: base.from, to: base.to, [key]: fromLocalInput(input)});
    };
    const filtered = hasPeriod(value) || value.game !== null;

    return (
        <div className="stats-filters">
            <div className="stats-filter-group" role="radiogroup" aria-label="Période">
                <button type="button" role="radio" aria-checked={!hasPeriod(value)} className={!hasPeriod(value) ? "active" : ""}
                        onClick={() => setPreset(null)}>Tout</button>
                {(Object.keys(PRESETS) as Preset[]).map(p => (
                    <button key={p} type="button" role="radio" aria-checked={value.preset === p} className={value.preset === p ? "active" : ""}
                            onClick={() => setPreset(p)}>{PRESETS[p].label}</button>
                ))}
                {custom && <span className="stats-filter-custom">Personnalisée</span>}
            </div>

            <div className="stats-filter-dates">
                <label>
                    Du
                    <input type="datetime-local" value={toLocalInput(value.preset ? null : value.from)}
                           max={toLocalInput(value.to)} onChange={e => setBound("from", e.target.value)}/>
                </label>
                <label>
                    au
                    <input type="datetime-local" value={toLocalInput(value.to)}
                           min={toLocalInput(value.from)} onChange={e => setBound("to", e.target.value)}/>
                </label>
            </div>

            {games && (
                <label className="stats-filter-game">
                    Jeu
                    <select value={value.game ?? ""} onChange={e => onChange({...value, game: e.target.value || null})}>
                        <option value="">Tous les jeux</option>
                        {games.map(g => <option key={g.code} value={g.code}>{g.name}</option>)}
                    </select>
                </label>
            )}

            {filtered && (
                <button type="button" className="stats-filter-reset" onClick={() => onChange({preset: null, from: null, to: null, game: null})}>
                    <FaTimes aria-hidden/> Effacer
                </button>
            )}
        </div>
    );
}
