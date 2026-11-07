/**
 * Défi d'un·e ami·e (/defi-ami/:id) : la grille d'une de ses parties gagnées, à faire à son tour.
 * Le jeu se charge comme un défi du jour (même grille pour les deux), puis la popup de victoire
 * compare les deux temps. Réservé aux joueurs connectés à qui le défi a été envoyé.
 * Un défi déjà relevé ne se rejoue pas : la page montre le résultat.
 */

import {useEffect, useState} from "react";
import {Link, Navigate, useParams} from "react-router-dom";
import {useAuth} from "../../Context/authContext.ts";
import {challengeService, type FriendChallenge} from "../../Services/challenge.service.ts";
import {shareTime} from "../../Services/share.ts";
import {playerPath} from "../../Services/player.service.ts";
import "./FriendChallenge.scss";
import PlayGame from "../PlayGame/PlayGame.tsx";
import Loader from "../Loader/Loader.tsx";

export default function FriendChallengePage() {
    const {id = ""} = useParams();
    const {isLoggedIn} = useAuth();
    const [challenge, setChallenge] = useState<FriendChallenge | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoggedIn) return;
        const controller = new AbortController();
        challengeService.get(id, controller.signal)
            .then(setChallenge)
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError(err.message || "Impossible de charger ce défi.");
            });
        return () => controller.abort();
    }, [id, isLoggedIn]);

    if (!isLoggedIn) return <Navigate to="/login" replace state={{from: `/defi-ami/${id}`}}/>;
    if (error) {
        return (
            <p className="game-list-status error" role="alert">
                {error} <Link to="/">Retour à l'accueil</Link>
            </p>
        );
    }
    if (!challenge) return <Loader label="Chargement du défi…"/>;
    if (challenge.playerMs !== null) {
        const mine = challenge.playerMs, theirs = challenge.senderMs;
        return (
            <main className="challenge-done">
                <section className={`challenge-outcome ${mine < theirs ? "win" : mine > theirs ? "lose" : "tie"}`}>
                    <p className="challenge-outcome-title">Défi déjà relevé</p>
                    <p>{challenge.gameName} de <Link to={playerPath(challenge.from.username)}>{challenge.from.username}</Link></p>
                    <p className="challenge-outcome-times">
                        <span><strong>{shareTime(mine)}</strong> toi</span>
                        <span className="vs">contre</span>
                        <span><strong>{shareTime(theirs)}</strong> {challenge.from.username}</span>
                    </p>
                    <p className="challenge-done-links">
                        <Link to={`/playgame/${challenge.gameCode}`}>Partie libre</Link> · <Link to="/">Accueil</Link>
                    </p>
                </section>
            </main>
        );
    }
    return <PlayGame challengeGame={challenge.gameCode} challengeId={challenge.challengeId}/>;
}
