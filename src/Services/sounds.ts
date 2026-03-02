import applauseSound from "../Sounds/applause.mp3";
import buttonSound from "../Sounds/button.mp3";
import fireballSound from "../Sounds/fireball.mp3";
import gameWinSound from "../Sounds/game-win.mp3";
import interface12Sound from "../Sounds/interface-12.mp3";
import interface9Sound from "../Sounds/interface-9.mp3";
import popSound from "../Sounds/pop.mp3";
import winYaySound from "../Sounds/win-yay.mp3";
import wooshSound from "../Sounds/woosh.mp3";


// Helper factory to create a player function for a given audio src
function createPlayer(src: string, volume: number, speed: number) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = volume;
    audio.playbackRate = speed;

    return function play() {
        audio.currentTime = 0;
        void audio.play();
    };
}

// Create players (alphabetical by identifier)
const applause = createPlayer(applauseSound, 0.6, 1);
const button = createPlayer(buttonSound, 0.75, 1);
const fireball = createPlayer(fireballSound, 0.9, 1);
const gameWin = createPlayer(gameWinSound, 0.9, 1);
const interface12 = createPlayer(interface12Sound, 0.9, 1);
const interface9 = createPlayer(interface9Sound, 0.8, 1);
const pop = createPlayer(popSound, 0.8, 1);
const winYay = createPlayer(winYaySound, 0.8, 1);
const woosh = createPlayer(wooshSound, 0.5, 1);

// Named exports (alphabetical)
export {
    applause,
    button,
    fireball,
    gameWin,
    interface12,
    interface9,
    pop,
    winYay,
    woosh,
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
    woosh,
} as const;

export default sounds;
