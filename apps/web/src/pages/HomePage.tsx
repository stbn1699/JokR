import {MORPION_GAME} from "../data/games";

export type HomePageProps = {
    heroImageSrc: string;
    onSelectGame: (gameId: string | null) => void;
};

export function HomePage({heroImageSrc, onSelectGame}: HomePageProps) {
    const handleStartMorpion = () => {
        onSelectGame(MORPION_GAME.id);
    };

    return (
        <>
            <section className="home-hero">
                <div className="home-hero__text">
                    <span className="hero-eyebrow">Arcade sociale JokR</span>
                    <h1>Plongez dans l'univers coloré de JokR</h1>
                    <p>
                        Retrouvez les teintes vibrantes de notre logo pour lancer vos soirées jeux en un clin d'œil.
                        Créez un salon, invitez vos amis et partagez des moments hauts en couleur.
                    </p>
                </div>
                <div className="home-hero__media">
                    <img src={heroImageSrc} alt="Illustration JokR" loading="lazy" />
                </div>
            </section>
            <section className="game-section">
                <header className="game-section__header">
                    <h2>Lancez votre partie de Morpion</h2>
                    <p>Invitez votre adversaire et affrontez-vous sur la grille 3×3.</p>
                </header>
                <div className="game-grid">
                    <button className="game-card" type="button" onClick={handleStartMorpion}>
                        <span className="game-title">{MORPION_GAME.label}</span>
                        <span className="game-description">{MORPION_GAME.description}</span>
                    </button>
                </div>
            </section>
        </>
    );
}
