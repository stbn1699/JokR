/**
 * Menu de la photo de profil (header) : tout ce qui n'est pas un jeu, rangé derrière l'icône du joueur.
 * - Niveau et XP (le header ne les montre plus sur téléphone)
 * - Mon profil, Succès, Personnaliser (page /personnaliser : fond, bille, jetons, effet de victoire), Nouveautés, Un bug ? Une idée ?
 * - Administrateurs : mode admin (Stats a son icône dans le header)
 * Se ferme au clic dehors, avec Échap, et en choisissant une entrée.
 */

import {useEffect, useRef, useState} from "react";
import {Link, useLocation} from "react-router-dom";
import {FaCommentDots, FaMedal, FaPalette, FaRegNewspaper, FaUser, FaUserShield} from "react-icons/fa";
import Avatar from "../Avatar/Avatar.tsx";
import {useAuth} from "../../Context/authContext.ts";
import {api} from "../../api/api.ts";

type ProfileMenuProps = {
    level: number;
    xp: number;
    xpNextLevel: number;
};

export default function ProfileMenu({level, xp, xpNextLevel}: ProfileMenuProps) {
    const auth = useAuth();
    const {pathname, search} = useLocation();
    const [open, setOpen] = useState(false);
    const [switching, setSwitching] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // Mode admin : le serveur le note, puis la page se recharge (crédits, cosmétiques et mises repartent de zéro)
    async function toggleAdminMode() {
        setSwitching(true);
        try {
            await api("/users/me/admin-mode", {method: "PUT", headers: {"Content-Type": "application/json"}, body: JSON.stringify({on: !auth.adminMode})});
            window.location.reload();
        } catch {
            setSwitching(false);
        }
    }

    const close = () => setOpen(false);

    return (
        <div className="profile-menu" ref={rootRef}>
            <button type="button" className="header-avatar" aria-haspopup="menu" aria-expanded={open}
                    title="Mon compte" onClick={() => setOpen(o => !o)}>
                <Avatar seed={auth.avatar} fallback={auth.username ?? auth.userId ?? undefined} size={2.5}
                        level={level} title="Mon compte"/>
            </button>

            {open && (
                <div className="profile-menu-panel" role="menu" aria-label="Mon compte">
                    <div className="profile-menu-head">
                        <strong>{auth.username}</strong>
                        <span>Niveau {level} · {xp} / {xpNextLevel} XP</span>
                        <span className="profile-menu-xp" aria-hidden>
                            <span style={{width: `${Math.min(100, xp / xpNextLevel * 100)}%`}}/>
                        </span>
                    </div>

                    <Link to="/profile" role="menuitem" onClick={close}><FaUser aria-hidden/> Mon profil</Link>
                    <Link to="/succes" role="menuitem" onClick={close}><FaMedal aria-hidden/> Succès</Link>
                    <Link to="/personnaliser" role="menuitem" onClick={close}><FaPalette aria-hidden/> Personnaliser</Link>
                    <Link to="/nouveautes" role="menuitem" onClick={close}><FaRegNewspaper aria-hidden/> Nouveautés</Link>
                    <Link to="/retour" state={{from: pathname + search}} role="menuitem" onClick={close}>
                        <FaCommentDots aria-hidden/> Un bug ? Une idée ?
                    </Link>

                    {auth.isAdmin && (
                        <>
                            <hr/>
                            <button type="button" role="menuitemcheckbox" aria-checked={auth.adminMode} disabled={switching}
                                    className={`profile-menu-admin ${auth.adminMode ? "on" : ""}`} onClick={() => void toggleAdminMode()}>
                                <FaUserShield aria-hidden/> {auth.adminMode ? "Quitter le mode admin" : "Mode admin"}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
