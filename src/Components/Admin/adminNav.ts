import type {IconType} from "react-icons";
import {
    FaBroadcastTower, FaCalendarCheck, FaChartLine, FaCircle, FaCommentDots, FaDice, FaFlag, FaLayerGroup,
    FaPuzzlePiece, FaQuestionCircle, FaShoppingBag, FaThLarge, FaUsers, FaUserFriends, FaDharmachakra, FaBook,
    FaBrain, FaClone, FaGem, FaHeart, FaTh,
} from "react-icons/fa";

/**
 * Plan de la console d'administration (/admin) : la barre latérale, rubrique par rubrique.
 * `badge` : compteur « à traiter » affiché à côté (voir AdminCounts).
 */

export type AdminBadge = "feedback" | "themes" | "questions" | "reports";

export type AdminLink = { path: string; label: string; icon: IconType; badge?: AdminBadge; end?: boolean };
export type AdminGroup = { title: string | null; links: AdminLink[] };

export const ADMIN_ROOT = "/admin";

export const ADMIN_NAV: AdminGroup[] = [
    {title: null, links: [{path: "", label: "Tableau de bord", icon: FaThLarge, end: true}]},
    {
        title: "Puzzles", links: [
            {path: "puzzles/activite", label: "Activité", icon: FaChartLine},
            {path: "puzzles/jeux", label: "Jeux", icon: FaPuzzlePiece},
            {path: "puzzles/defis", label: "Défis du jour", icon: FaCalendarCheck},
            {path: "puzzles/joueurs", label: "Joueurs", icon: FaUsers},
        ],
    },
    {
        title: "Hasard", links: [
            {path: "hasard/apercu", label: "Aperçu", icon: FaDice},
            {path: "hasard/plinko", label: "Plinko", icon: FaCircle},
            {path: "hasard/roulette", label: "Roulette", icon: FaDharmachakra},
            {path: "hasard/machines", label: "Machines à sous", icon: FaGem},
            {path: "hasard/blackjack", label: "Blackjack", icon: FaClone},
            {path: "hasard/keno", label: "Keno", icon: FaTh},
            {path: "hasard/poker", label: "Poker", icon: FaHeart},
            {path: "hasard/joueurs", label: "Joueurs", icon: FaUserFriends},
        ],
    },
    {
        title: "Quizz", links: [
            {path: "quizz/activite", label: "Activité", icon: FaBrain},
            {path: "quizz/banque", label: "Banque de questions", icon: FaBook},
        ],
    },
    {title: "Boutique", links: [{path: "boutique", label: "Ventes", icon: FaShoppingBag}]},
    {
        title: "Modération", links: [
            {path: "retours", label: "Retours des joueurs", icon: FaCommentDots, badge: "feedback"},
            {path: "quizz/themes", label: "Thèmes à valider", icon: FaLayerGroup, badge: "themes"},
            {path: "quizz/questions", label: "Questions à valider", icon: FaQuestionCircle, badge: "questions"},
            {path: "quizz/contestations", label: "Contestations", icon: FaFlag, badge: "reports"},
        ],
    },
    {title: "Site", links: [{path: "direct", label: "En direct & mise à jour", icon: FaBroadcastTower}]},
];

export const adminPath = (path: string) => (path ? `${ADMIN_ROOT}/${path}` : ADMIN_ROOT);
