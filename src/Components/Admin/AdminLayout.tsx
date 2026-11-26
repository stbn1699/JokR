import "../Stats/Stats.scss";
import "./Admin.scss";
import {useEffect} from "react";
import {Link, Navigate, NavLink, Outlet, useLocation} from "react-router-dom";
import {FaArrowLeft, FaUserShield} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {useMaintenance} from "../../Services/maintenance.ts";
import Loader from "../Loader/Loader.tsx";
import {ADMIN_NAV, adminPath} from "./adminNav.ts";
import {AdminCountsProvider, useAdminCounts} from "./AdminCounts.tsx";
import {periodSearch} from "./useAdminFilter.ts";

/**
 * Console d'administration (/admin, administrateurs uniquement), pensée pour un écran d'ordinateur :
 * barre latérale fixe à gauche (rubriques, compteurs « à traiter »), la page choisie à droite (voir adminNav.ts).
 * La période des statistiques suit d'une page à l'autre.
 */
export default function AdminLayout() {
    const {isLoggedIn, isAdmin, username} = useAuth();
    if (!isLoggedIn) return <Navigate to="/login" replace/>;
    // Profil pas encore chargé : on ne sait pas encore si le joueur est administrateur
    if (!username) return <Loader/>;
    if (!isAdmin) return <p className="stats-status">Cette page est réservée à l'administrateur.</p>;
    return (
        <AdminCountsProvider>
            <FixedWindow/>
            <div className="admin">
                <AdminSidebar/>
                <main className="admin-main stats">
                    <Outlet/>
                </main>
            </div>
        </AdminCountsProvider>
    );
}

// Tant que la console est ouverte, la fenêtre ne défile pas (seule la page à droite défile, voir Admin.scss)
function FixedWindow() {
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add("admin-fixed");
        window.scrollTo(0, 0);
        return () => root.classList.remove("admin-fixed");
    }, []);
    return null;
}

function AdminSidebar() {
    const {search} = useLocation();
    const {counts} = useAdminCounts();
    const site = useMaintenance();
    const keep = periodSearch(search);

    return (
        <aside className="admin-sidebar">
            <div className="admin-brand">
                <FaUserShield aria-hidden/>
                <div>
                    <strong>Administration</strong>
                    <span>JokR</span>
                </div>
            </div>
            <nav aria-label="Administration">
                {ADMIN_NAV.map((group, i) => (
                    <div key={group.title ?? i} className="admin-nav-group">
                        {group.title && <span className="admin-nav-title">{group.title}</span>}
                        <ul>
                            {group.links.map(link => {
                                const count = link.badge ? counts[link.badge] : null;
                                const Icon = link.icon;
                                return (
                                    <li key={link.path}>
                                        <NavLink to={{pathname: adminPath(link.path), search: keep}} end={link.end}
                                                 className={({isActive}) => `admin-nav-link ${isActive ? "active" : ""}`}>
                                            <Icon aria-hidden/>
                                            <span>{link.label}</span>
                                            {count !== null && count !== undefined && count > 0 && <em className="admin-badge">{count}</em>}
                                            {link.path === "direct" && site.on && <em className="admin-badge warn">Fermé</em>}
                                        </NavLink>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
            <Link to="/" className="admin-back"><FaArrowLeft aria-hidden/> Retour au site</Link>
        </aside>
    );
}
