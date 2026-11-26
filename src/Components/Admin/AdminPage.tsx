import type {ReactNode} from "react";
import {FaSyncAlt} from "react-icons/fa";
import StatsFilters from "../Stats/StatsFilters.tsx";
import Loader from "../Loader/Loader.tsx";
import {useAdminFilter} from "./useAdminFilter.ts";

/**
 * Une page de la console d'administration : en-tête collant (rubrique, titre, description, date de mise à jour,
 * actions, bouton Actualiser), barre de filtres si la page en a, puis le contenu.
 * `filters` : jeux proposés dans le choix du jeu (null : période seulement ; absent : pas de filtres).
 */
export default function AdminPage({group, title, description, meta, actions, filters, onRefresh, refreshing, children}: {
    group?: string;
    title: string;
    description?: ReactNode;
    meta?: ReactNode;
    actions?: ReactNode;
    filters?: { code: string; name: string }[] | null;
    onRefresh?: () => void;
    refreshing?: boolean;
    children: ReactNode;
}) {
    const [filter, setFilter] = useAdminFilter();
    return (
        <div className="admin-page">
            <header className="admin-page-head">
                <div className="admin-page-title">
                    {group && <span className="admin-page-group">{group}</span>}
                    <h1>{title}</h1>
                    {description && <p className="admin-page-description">{description}</p>}
                </div>
                <div className="admin-page-side">
                    {(actions || onRefresh) && <div className="admin-actions">
                        {actions}
                        {onRefresh && <button type="button" onClick={onRefresh} disabled={refreshing}>
                            <FaSyncAlt aria-hidden className={refreshing ? "spin" : ""}/> Actualiser
                        </button>}
                    </div>}
                    {meta && <p className="admin-page-meta">{meta}</p>}
                </div>
                {filters !== undefined && <div className="admin-page-filters">
                    <StatsFilters value={filter} onChange={setFilter} games={filters}/>
                </div>}
            </header>
            <div className="admin-page-body">{children}</div>
        </div>
    );
}

// Contenu d'une page de statistiques : erreur, chargement, puis les données
export function StatsBody<T>({data, error, label, children}: {
    data: T | null;
    error: string | null;
    label: string;
    children: (data: T) => ReactNode;
}) {
    return <>
        {error && <p className="stats-status stats-error" role="alert">{error}</p>}
        {!data && !error && <Loader label={label}/>}
        {data && <div className="fade-in">{children(data)}</div>}
    </>;
}
