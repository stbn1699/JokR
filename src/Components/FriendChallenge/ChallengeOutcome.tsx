import {useEffect, useState} from "react";
import {FaUserFriends} from "react-icons/fa";
import {challengeService, type ChallengeResult} from "../../Services/challenge.service.ts";
import {shareTime} from "../../Services/share.ts";

/**
 * Dans la popup de victoire d'un défi d'un·e ami·e : enregistre ton temps (la première fois, l'ami·e en est informé·e)
 * et compare les deux temps.
 */
export default function ChallengeOutcome({challengeId}: { challengeId: string }) {
    const [result, setResult] = useState<ChallengeResult | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        challengeService.result(challengeId)
            .then(r => {
                if (!cancelled) setResult(r);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [challengeId]);

    if (error) return null;
    if (!result) return <p className="challenge-outcome pending"><FaUserFriends aria-hidden/> Comparaison avec ton ami·e…</p>;

    const mine = result.latestMs;
    const theirs = result.senderMs;
    const verdict = mine < theirs ? "win" : mine > theirs ? "lose" : "tie";
    return (
        <div className={`challenge-outcome ${verdict}`}>
            <p className="challenge-outcome-title">
                {verdict === "win" ? `Tu bats ${result.from.username} !` : verdict === "lose" ? `${result.from.username} reste devant` : "Égalité parfaite !"}
            </p>
            <p className="challenge-outcome-times">
                <span><strong>{shareTime(mine)}</strong> toi</span>
                <span className="vs">contre</span>
                <span><strong>{shareTime(theirs)}</strong> {result.from.username}</span>
            </p>
            {!result.first && <p className="challenge-outcome-note">Seule ta première réussite ({shareTime(result.playerMs)}) est envoyée à {result.from.username}.</p>}
        </div>
    );
}
