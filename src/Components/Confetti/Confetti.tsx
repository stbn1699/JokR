/**
 * Système d'animation de confettis pour célébrer une victoire
 *
 * Génère des confettis colorés qui tombent de haut en bas avec rotation
 * Animation non bloquante qui se nettoie automatiquement
 *
 * Fonctionnement :
 * 1. Crée un conteneur en overlay plein écran
 * 2. Génère des confettis à intervalles réguliers
 * 3. Chaque confetti a une couleur, vitesse et rotation aléatoires
 * 4. Après 5 secondes, les confettis disparaissent progressivement (fade-out)
 * 5. Le conteneur est retiré du DOM après l'animation
 */

import "./Confetti.scss";

// =====================
// PARAMÈTRES DE CONFIGURATION
// =====================

/** Durée totale de l'animation avant le fade-out (en millisecondes) */
const CONFETTI_DURATION = 5000

/** Intervalle entre chaque vague de confettis (en millisecondes) */
const CONFETTI_INTERVAL = 50

/** Nombre de confettis générés à chaque vague */
const CONFETTI_PER_TICK = 6

/** Vitesse de chute de base en secondes (valeur plus haute = chute plus lente) */
const FALL_SPEED = 1

/** Variation aléatoire ajoutée à la vitesse de chute (en secondes) */
const FALL_SPEED_VARIATION = 2

/** Multiplicateur pour la vitesse de rotation des confettis */
const ROTATION_SPEED = 5

/** Nombre de degrés de rotation de base pour chaque confetti */
const BASE_ROTATION = 720

// =====================

/**
 * Lance l'animation de confettis
 *
 * Crée un conteneur d'overlay et génère des confettis à intervalle régulier.
 * L'animation s'arrête automatiquement après CONFETTI_DURATION millisecondes.
 */
export function confetti() {
    // Création du conteneur qui contiendra tous les confettis
    const container = document.createElement("div");
    container.className = "confetti-container";
    document.body.appendChild(container); // Ajout au DOM

    // Calcul du timestamp de fin d'animation
    const endTime = Date.now() + CONFETTI_DURATION;

    // Intervalle qui génère les confettis toutes les CONFETTI_INTERVAL ms
    const confettiInterval = setInterval(() => {
        // Si le temps est écoulé, on arrête la génération
        if (Date.now() > endTime) {
            clearInterval(confettiInterval); // Arrêt de l'intervalle

            // Ajoute la classe pour démarrer l'animation de fade-out
            container.classList.add("fade-out");

            // Après le fade-out (1.5s), on retire le conteneur du DOM
            setTimeout(() => {
                container.remove();
            }, 1500);
            return;
        }

        // Génération d'une vague de confettis
        for (let i = 0; i < CONFETTI_PER_TICK; i++) {
            // Création d'un élément span pour chaque confetti
            const confetti = document.createElement("span");
            confetti.className = "confetti";

            // Position horizontale aléatoire sur toute la largeur de l'écran
            confetti.style.left = Math.random() * 100 + "vw";

            // Vitesse de chute aléatoire (entre FALL_SPEED et FALL_SPEED + FALL_SPEED_VARIATION)
            confetti.style.animationDuration =
                FALL_SPEED + Math.random() * FALL_SPEED_VARIATION + "s";

            // Définit la rotation finale du confetti (utilisée par l'animation CSS)
            confetti.style.setProperty(
                "--rotation",
                `${BASE_ROTATION * ROTATION_SPEED}deg`
            );

            // Couleur aléatoire en HSL (teinte aléatoire, saturation 80%, luminosité 60%)
            confetti.style.backgroundColor =
                `hsl(${Math.random() * 360}, 80%, 60%)`;

            // Ajout du confetti au conteneur
            container.appendChild(confetti);

            // Nettoyage : suppression du confetti après 10 secondes (largement après sa chute)
            setTimeout(() => confetti.remove(), 10000);
        }
    }, CONFETTI_INTERVAL);
}
