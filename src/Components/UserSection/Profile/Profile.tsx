/**
 * Page Profil - joueur connecté, en deux onglets (dans l'adresse : ?onglet=parametres)
 * - Profil : sa page telle que les autres la voient (PlayerProfileView), avec tout visible pour lui
 *   et un rappel de ce qu'il cache aux autres
 * - Paramètres : icône, pseudo, visibilité de sa page, comptes liés, mot de passe, zone de danger
 * Redirige vers /login si personne n'est connecté.
 */

import {FaPen} from "react-icons/fa";
import "./Profile.scss";
import {useEffect, useState} from "react";
import {Navigate, useSearchParams} from "react-router-dom";
import {useAuth} from "../../../Context/authContext.ts";
import {userService} from "../../../Services/user.service.ts";
import type {Privacy} from "../../../Models/user.model.ts";
import PlayerProfileView from "../../PlayerProfile/PlayerProfileView.tsx";
import ProfileSettings from "./ProfileSettings.tsx";
import AvatarPicker from "../../Avatar/AvatarPicker.tsx";
import Loader from "../../Loader/Loader.tsx";

const TABS = [
    {id: "profil", label: "Profil"},
    {id: "parametres", label: "Paramètres"},
] as const;
type Tab = typeof TABS[number]["id"];

export default function Profile() {
    const {isLoggedIn, username, avatar, setAvatar, logout} = useAuth();
    const [params, setParams] = useSearchParams();
    const tab: Tab = params.get("onglet") === "parametres" ? "parametres" : "profil";
    const [pickingAvatar, setPickingAvatar] = useState(false);
    // Vrai quand le joueur quitte volontairement (déconnexion, compte supprimé) : retour à l'accueil
    const [leaving, setLeaving] = useState(false);
    const [privacy, setPrivacy] = useState<Privacy | null>(null);

    useEffect(() => {
        if (!isLoggedIn) return;
        userService.getMe()
            .then(me => setPrivacy(me.privacy ?? {showStats: true, showHistory: true}))
            .catch(() => undefined);
    }, [isLoggedIn]);

    // Sans session : vers la connexion, sauf si le joueur vient de se déconnecter (alors l'accueil)
    if (!isLoggedIn) return <Navigate to={leaving ? "/" : "/login"} replace/>;

    const handleLogout = () => {
        setLeaving(true);
        logout();
    };
    const openTab = (next: Tab) => setParams(next === "profil" ? {} : {onglet: next}, {replace: true});

    return (
        <main className="profile">
            <div className="profile-page">
                <div className="profile-tabs" role="tablist">
                    {TABS.map(t => (
                        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
                                className={tab === t.id ? "selected" : ""} onClick={() => openTab(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === "profil" && (
                    !username ? <Loader label="Chargement du profil…"/> : (
                        // key : la page se recharge après un changement d'icône ou de pseudo
                        <PlayerProfileView key={`${username}-${avatar}`} username={username} privacy={privacy ?? undefined}
                                           backLink={false} onOpenSettings={() => openTab("parametres")}
                                           avatarAction={
                                               <button type="button" className="profile-avatar-edit" title="Changer d'icône"
                                                       onClick={() => setPickingAvatar(true)}>
                                                   <FaPen aria-hidden/>
                                               </button>
                                           }/>
                    )
                )}

                {tab === "parametres" && (
                    <ProfileSettings privacy={privacy} onPrivacyChange={setPrivacy}
                                     onPickAvatar={() => setPickingAvatar(true)} onLogout={handleLogout}/>
                )}
            </div>

            {pickingAvatar && (
                <AvatarPicker value={avatar ?? username ?? "jokr"} onClose={() => setPickingAvatar(false)}
                              onConfirm={async seed => {
                                  await userService.changeAvatar(seed);
                                  setAvatar(seed);
                              }}/>
            )}
        </main>
    );
}
