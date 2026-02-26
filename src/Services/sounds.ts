import applauseSound from "../Sounds/applause.mp3";
import buttonSound from "../Sounds/button.mp3";
import fireballSound from "../Sounds/fireball.mp3";
import gameWinSound from "../Sounds/game-win.mp3";
import interface12Sound from "../Sounds/interface-12.mp3";
import interface9Sound from "../Sounds/interface-9.mp3";
import popSound from "../Sounds/pop.mp3";
import winYaySound from "../Sounds/win-yay.mp3";


// Helper factory to create a player function for a given audio src
function createPlayer(src: string, volume = 0.8) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;

    return function play() {
        audio.currentTime = 0;
        void audio.play();
    };
}

// Create players (alphabetical by identifier)
const applause = createPlayer(applauseSound, 0.6);
const button = createPlayer(buttonSound, 0.75);
const fireball = createPlayer(fireballSound, 0.9);
const gameWin = createPlayer(gameWinSound, 0.9);
const interface12 = createPlayer(interface12Sound, 0.9);
const interface9 = createPlayer(interface9Sound, 0.8);
const pop = createPlayer(popSound, 0.8);
const winYay = createPlayer(winYaySound, 0.8);

// Named exports (alphabetical)
export {
    applause,
    button,
    fireball,
    gameWin,
    interface12,
    interface9,
    pop,
    winYay
};

// Default export: single object to call sounds.button(), sounds.fireball(), etc.
const sounds = {
    applause,
    button,
    fireball,
    gameWin,
    interface12,
    interface9,
    pop,
    winYay,
} as const;

export default sounds;
