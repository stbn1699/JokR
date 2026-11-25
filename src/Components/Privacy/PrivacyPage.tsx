/**
 * Page « Confidentialité » (/confidentialite) : politique de confidentialité, cookies et RGPD.
 * Reprend la mise en page de la page Nouveautés (classes changelog-*).
 *
 * À tenir à jour quand le site enregistre de nouvelles données ou passe par un nouveau service
 * (voir backend/src/db/schema.ts et les services tiers : Google AdSense, connexion Google / Discord, push).
 */

import "../Changelog/Changelog.scss";
import "./PrivacyPage.scss";
import {Link, useLocation, useNavigate} from "react-router-dom";

const CONTACT = "jokr.games@proton.me";
const UPDATED = "25 novembre 2026";

const Mail = () => <a href={`mailto:${CONTACT}`}>{CONTACT}</a>;
const Ext = ({href, children}: { href: string; children: string }) =>
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

export default function PrivacyPage() {
    const navigate = useNavigate();
    // Arrivé directement sur la page (lien partagé, rafraîchissement) : pas de page précédente dans le site
    const hasPrevious = useLocation().key !== "default";

    return (
        <main className="changelog privacy">
            <div className="changelog-column">
                <button type="button" className="changelog-back" onClick={() => (hasPrevious ? navigate(-1) : navigate("/"))}>
                    ← Retour
                </button>
                <section className="changelog-card">
                    <h1>Confidentialité</h1>
                    <p className="changelog-current">Données personnelles, cookies et publicité · mise à jour le {UPDATED}</p>

                    <article className="changelog-version">
                        <h2>En bref</h2>
                        <ul>
                            <li>JokR ne vend pas tes données et n'utilise <b>aucun cookie à lui</b>.</li>
                            <li>On garde ce qu'il faut pour faire tourner ton compte et tes parties, rien de plus.</li>
                            <li>Des cookies de <b>Google</b> peuvent être utilisés <b>seulement si tu choisis de regarder une pub</b> pour
                                gagner des crédits.</li>
                            <li>Tu peux supprimer ton compte à tout moment depuis ton <Link to="/profile">profil</Link>, et nous
                                écrire à <Mail/> pour toute question.</li>
                        </ul>
                    </article>

                    <article className="changelog-version">
                        <h2>Qui s'occupe de tes données</h2>
                        <p>
                            JokR est un site personnel, édité et hébergé par l'éditeur de JokR sur son propre serveur, en France.
                            Pour toute question ou demande sur tes données : <Mail/>.
                        </p>
                    </article>

                    <article className="changelog-version">
                        <h2>Ce qu'on enregistre</h2>
                        <h3>Ton compte</h3>
                        <ul>
                            <li>Ton pseudo, ton adresse e-mail et ton mot de passe. Le mot de passe est chiffré de façon
                                irréversible : personne ne peut le lire, pas même nous.</li>
                            <li>Ce que tu choisis d'afficher : icône de profil, pronoms, fond, objets de la boutique, et la
                                visibilité de tes statistiques pour les autres joueurs.</li>
                            <li>La date de création du compte et celle de ta dernière visite.</li>
                            <li>Si tu te connectes avec <b>Google</b> ou <b>Discord</b> : l'identifiant de ton compte chez eux, et
                                l'adresse e-mail et le nom qu'ils nous transmettent. On ne reçoit jamais ton mot de passe Google ou
                                Discord.</li>
                        </ul>
                        <h3>Tes parties</h3>
                        <ul>
                            <li>Tes parties (jeu, taille de grille, temps, réussite), tes niveaux, ton XP, tes crédits, tes succès,
                                tes résultats aux défis et aux classements.</li>
                            <li>Tes mises et tes gains aux jeux de hasard. Ce sont des <b>crédits virtuels</b> : ils ne s'achètent
                                pas et ne valent pas d'argent.</li>
                            <li>Le type d'appareil (ordinateur, téléphone ou tablette), déduit de ton navigateur, pour nos
                                statistiques.</li>
                            <li>Sans compte, les parties sont enregistrées de façon anonyme, sans rien qui permette de te
                                reconnaître.</li>
                        </ul>
                        <h3>Le social</h3>
                        <ul>
                            <li>Ta liste d'amis, les messages que tu échanges avec eux et les défis entre amis.</li>
                        </ul>
                        <h3>Le reste</h3>
                        <ul>
                            <li><b>Tes retours</b> (« Un bug ? Une idée ? ») : ton message, la page d'où tu l'as envoyé et le nom
                                de ton navigateur, pour nous aider à reproduire le problème.</li>
                            <li><b>Les notifications</b>, si tu les actives : l'adresse d'abonnement que ton navigateur nous donne
                                pour te les envoyer.</li>
                            <li><b>Les pubs récompensées</b> : l'heure à laquelle tu lances une pub et celle où tu reçois tes
                                crédits (pour limiter le nombre de pubs par jour).</li>
                        </ul>
                        <p>
                            On n'enregistre pas ton adresse IP. Le serveur s'en sert seulement en mémoire, quelques minutes, pour
                            freiner les abus (par exemple trop d'essais de connexion).
                        </p>
                    </article>

                    <article className="changelog-version">
                        <h2>Pourquoi</h2>
                        <ul>
                            <li><b>Faire marcher le site</b> (ton compte, tes parties, tes amis, la boutique) : c'est le service que
                                tu demandes en t'inscrivant.</li>
                            <li><b>Améliorer le site et le protéger</b> (statistiques de parties, retours, limites anti-abus) : c'est
                                notre intérêt légitime, et ces statistiques ne servent qu'à nous.</li>
                            <li><b>La publicité et les notifications</b> : seulement avec ton accord, que tu peux retirer quand tu
                                veux.</li>
                        </ul>
                    </article>

                    <article className="changelog-version">
                        <h2>Cookies et stockage du navigateur</h2>
                        <p>
                            JokR ne dépose <b>aucun cookie</b>. Il utilise le stockage local de ton navigateur pour des choses
                            indispensables ou pratiques : rester connecté, retenir tes réglages (filtres, dernières mises…) et
                            garder une partie en cours. Ces données restent sur ton appareil ; tu peux les effacer depuis les
                            réglages de ton navigateur (tu seras alors déconnecté).
                        </p>
                    </article>

                    <article className="changelog-version">
                        <h2>Publicité (Google AdSense)</h2>
                        <p>
                            Le bouton « Obtenir plus de crédits » te propose de regarder une pub pour gagner des crédits. Le code
                            publicitaire de Google n'est chargé <b>que quand tu ouvres une pub</b> : sans ça, Google ne reçoit rien.
                        </p>
                        <p>
                            Quand une pub s'affiche, Google peut utiliser des cookies ou des identifiants publicitaires, par
                            exemple pour choisir la pub, en limiter la répétition ou lutter contre la fraude. Si tu es en Europe,
                            Google te demande ton accord avant toute pub personnalisée : tu peux refuser et recevoir quand même
                            des pubs, non personnalisées.
                        </p>
                        <ul>
                            <li><Ext href="https://policies.google.com/technologies/partner-sites?hl=fr">Comment Google utilise les
                                données des sites partenaires</Ext></li>
                            <li><Ext href="https://policies.google.com/technologies/ads?hl=fr">Les cookies publicitaires de
                                Google</Ext></li>
                            <li><Ext href="https://myadcenter.google.com/?hl=fr">Régler tes préférences publicitaires
                                Google</Ext></li>
                        </ul>
                    </article>

                    <article className="changelog-version">
                        <h2>Qui voit tes données</h2>
                        <ul>
                            <li><b>Les autres joueurs</b> voient ton pseudo, ton icône, ton niveau, tes pronoms, ta place aux
                                classements et, si tu le laisses activé dans ton profil, tes statistiques et tes dernières
                                victoires. Tes messages ne sont visibles que par l'ami à qui tu écris.</li>
                            <li><b>Les services qui nous aident</b>, seulement pour ce qui les concerne : Google (publicité, et
                                connexion si tu l'utilises), Discord (connexion si tu l'utilises), et le service de notifications de
                                ton navigateur (Google, Mozilla ou Apple) si tu actives les notifications. Certains peuvent traiter
                                des données hors de l'Union européenne, dans le cadre prévu par le RGPD.</li>
                            <li>Personne d'autre : on ne vend ni ne loue tes données.</li>
                        </ul>
                    </article>

                    <article className="changelog-version">
                        <h2>Combien de temps</h2>
                        <p>
                            Tes données sont gardées tant que ton compte existe. Quand tu le supprimes, tout est effacé : compte,
                            amis, messages, objets, succès, retours, notifications. Seules les statistiques de parties sont
                            gardées, mais sans aucun lien avec toi.
                        </p>
                    </article>

                    <article className="changelog-version">
                        <h2>Tes droits</h2>
                        <p>
                            Tu peux à tout moment accéder à tes données, les corriger, les effacer, les récupérer dans un format
                            lisible, t'opposer à leur utilisation ou la limiter, et retirer ton accord pour la publicité ou les
                            notifications.
                        </p>
                        <ul>
                            <li>Supprimer ton compte : depuis ton <Link to="/profile">profil</Link>.</li>
                            <li>Tout le reste : écris à <Mail/>, on te répond sous un mois.</li>
                            <li>Si tu penses que tes droits ne sont pas respectés, tu peux te plaindre auprès de la
                                {" "}<Ext href="https://www.cnil.fr/fr/plaintes">CNIL</Ext>.</li>
                        </ul>
                        <p>
                            Si tu as moins de 15 ans, demande l'accord d'un parent avant d'accepter la publicité personnalisée.
                        </p>
                    </article>

                    <article className="changelog-version">
                        <h2>Changements</h2>
                        <p>
                            Si cette page change de façon importante, on te le dira sur le site. La date de la dernière mise à jour
                            est indiquée en haut.
                        </p>
                    </article>
                </section>
            </div>
        </main>
    );
}
