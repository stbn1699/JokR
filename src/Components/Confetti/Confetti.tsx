// =====================
// CONFIGURATION
// =====================
const CONFETTI_DURATION = 5000 // durée totale (ms)
const CONFETTI_INTERVAL = 50 // fréquence de génération (ms)
const CONFETTI_PER_TICK = 6 // quantité par vague
const FALL_SPEED = 1 // secondes (plus grand = plus lent)
const FALL_SPEED_VARIATION = 2 // variation aléatoire
const ROTATION_SPEED = 5 // multiplicateur de rotation
const BASE_ROTATION = 720 // degrés de base
// =====================

export function confetti() {
    const container = document.createElement("div");
    container.className = "confetti-container";
    document.body.appendChild(container);

    const endTime = Date.now() + CONFETTI_DURATION;

    const confettiInterval = setInterval(() => {
        if (Date.now() > endTime) {
            clearInterval(confettiInterval);
            container.classList.add("fade-out");

            setTimeout(() => {
                container.remove();
            }, 1500);
            return;
        }

        for (let i = 0; i < CONFETTI_PER_TICK; i++) {
            const confetti = document.createElement("span");
            confetti.className = "confetti";

            confetti.style.left = Math.random() * 100 + "vw";
            confetti.style.animationDuration =
                FALL_SPEED + Math.random() * FALL_SPEED_VARIATION + "s";

            confetti.style.setProperty(
                "--rotation",
                `${BASE_ROTATION * ROTATION_SPEED}deg`
            );

            confetti.style.backgroundColor =
                `hsl(${Math.random() * 360}, 80%, 60%)`;

            container.appendChild(confetti);

            setTimeout(() => confetti.remove(), 10000);
        }
    }, CONFETTI_INTERVAL);
}
