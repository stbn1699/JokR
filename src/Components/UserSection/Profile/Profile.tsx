/**
 * Page Profil - joueur connecté, en trois onglets (dans l'adresse : ?onglet=amis|parametres)
 * - Profil : sa page telle que les autres la voient (PlayerProfileView), avec tout visible pour lui
 *   et un rappel de ce qu'il cache aux autres
 * - Amis : ajouter un ami, demandes reçues à accepter, liste d'amis
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
import FriendsTab from "./FriendsTab.tsx";
import {useFriends} from "../../../Services/friends.service.ts";
import AvatarPicker from "../../Avatar/AvatarPicker.tsx";
import Loader from "../../Loader/Loader.tsx";

const TABS = [
    {id: "profil", label: "Profil"},
    {id: "amis", label: "Ami·e·s"},
    {id: "parametres", label: "Paramètres"},
] as const;
type Tab = typeof TABS[number]["id"];

export default function Profile() {
    const {isLoggedIn, userId, username, avatar, setAvatar, logout} = useAuth();
    // Demandes d'ami reçues : pastille sur l'onglet Amis
    const {incoming} = useFriends(userId);
    const [params, setParams] = useSearchParams();
    const tab: Tab = TABS.find(t => t.id === params.get("onglet"))?.id ?? "profil";
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
                            {t.id === "amis" && incoming.length > 0 && <span className="profile-tab-count">{incoming.length}</span>}
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

                {tab === "amis" && <FriendsTab/>}

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
