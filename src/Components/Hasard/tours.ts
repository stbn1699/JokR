import type {TourStep} from "../InterfaceTour/InterfaceTour.tsx";

/*
 * Visites de l'interface des jeux de hasard (la roue du jour n'en a pas) : quelques étapes courtes par jeu,
 * proposées à la première ouverture de la page (voir RulesButton et GameTour). Les éléments sont trouvés par
 * leurs classes ; ceux qui n'existent pas encore à l'écran (pas de partie en cours…) sont simplement sautés.
 */

const CREDITS: TourStep = {target: "a.credits", text: "Ton solde de crédits : la mise en est retirée, les gains y sont ajoutés."};
const RULES: TourStep = {target: ".casino-title .rules-button", text: "Les règles complètes et les gains sont ici. Tu peux aussi y relancer cette visite."};

const tour = (code: string, steps: TourStep[]) => ({code, steps});

export const TOURS = {
    PLINKO: tour("PLINKO", [
        {target: ".plinko-bets", text: "Choisis ta mise en touchant un jeton."},
        // téléphone seulement (le bouton est caché sur ordinateur, l'étape est alors sautée)
        {target: ".plinko-controls .casino-settings-toggle", text: "Le tableau de gains, le nombre de billes et l'affichage des autres joueurs sont rangés ici."},
        {target: ".plinko-risks:not(.plinko-counts)", text: "Le tableau de gains : prudent gagne souvent mais peu, risqué paie gros sur les bords et presque rien au centre."},
        {target: ".plinko-counts", text: "Combien de billes lâcher d'un coup."},
        {target: ".plinko-drop", text: "Ce bouton lâche tes billes."},
        {target: ".plinko-board", text: "La bille rebondit sur les clous : la case où elle tombe multiplie ta mise."},
        {target: ".plinko-side", text: "Tes dernières billes et ce qu'elles t'ont rapporté."},
        CREDITS,
        RULES,
    ]),
    ROULETTE: tour("ROULETTE", [
        {target: ".roulette-phase", text: "Une seule table pour tout le monde : on mise tant que la barre avance, puis la roue tourne."},
        {target: ".roulette-chips", text: "Choisis la valeur du jeton à poser."},
        {target: ".roulette-table", text: "Touche un numéro, une couleur ou une zone pour y poser ton jeton."},
        {target: ".roulette-actions", text: "Ta mise totale, et de quoi retirer tes jetons, annuler le dernier geste ou reproduire ta mise du tour d'avant."},
        {target: ".roulette-wheel-card", text: "La roue et le numéro sorti ; tes gains arrivent dans ton solde."},
        RULES,
    ]),
    SLOTS: tour("SLOTS", [
        {target: ".slots-bets", text: "Choisis ta mise par lancer."},
        // téléphone seulement (le bouton est caché sur ordinateur, l'étape est alors sautée)
        {target: ".slots-controls .casino-settings-toggle", text: "Le nombre de colonnes, de lignes de gain et de lancers à enchaîner sont rangés ici."},
        {target: ".slots-controls .slots-choices", text: "Le nombre de colonnes, de lignes de gain et de lancers à enchaîner."},
        {target: ".slots-spin", text: "Lance les rouleaux (ou arrête une série en cours)."},
        {target: ".slot-window", text: "Au moins 3 symboles identiques à la suite sur une ligne de gain, en partant de la gauche : la ligne gagne."},
        {target: ".slots-side", text: "Tes derniers lancers et ce qu'ils t'ont rapporté."},
        CREDITS,
        RULES,
    ]),
    BLACKJACK: tour("BLACKJACK", [
        {target: ".bj-bets", text: "Choisis ta mise."},
        {target: ".bj-deal", text: "Distribue les cartes. Ensuite : Tirer pour une carte de plus, Rester pour t'arrêter."},
        {target: ".bj-table", text: "Le croupier en haut, ta main en bas : approche-toi de 21 sans dépasser, et fais mieux que lui."},
        {target: ".bj-side", text: "Tes dernières mains et ce qu'elles t'ont rapporté."},
        CREDITS,
        RULES,
    ]),
    KENO: tour("KENO", [
        {target: ".keno-bets", text: "Choisis ta mise."},
        {target: ".keno-grid", text: "Touche jusqu'à 10 numéros sur la grille."},
        {target: ".keno-tools", text: "Ou laisse le hasard choisir pour toi, et efface ta sélection ici."},
        {target: ".keno-play", text: "Lance le tirage : 10 numéros sortent."},
        {target: ".keno-side", text: "Ce que tu gagnes selon le nombre de numéros trouvés, et tes derniers tirages."},
        CREDITS,
        RULES,
    ]),
    POKER: tour("POKER", [
        {target: ".poker-bets", text: "Choisis ta mise."},
        {target: ".poker-main", text: "Distribue 5 cartes. Touche celles à garder, puis ce même bouton tire les autres."},
        {target: ".poker-cards", text: "Tes cartes : la combinaison finale décide du gain."},
        {target: ".poker-pays", text: "Ce que rapporte chaque combinaison, en multiple de ta mise."},
        CREDITS,
        RULES,
    ]),
    LOTTERY: tour("LOTTERY", [
        {target: ".lottery-sub", text: "Pas de mise ici : chaque tranche de 10 crédits misés aux autres jeux te donne un ticket."},
        {target: ".lottery-card:first-child", text: "Chaque carte est une loterie : sa cagnotte et l'heure du tirage."},
        {target: ".lottery-card:first-child .lottery-mine", text: "Tes tickets et tes chances de gagner."},
        RULES,
    ]),
};
