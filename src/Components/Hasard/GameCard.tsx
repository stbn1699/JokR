import {type ReactNode, useState} from "react";
import {Link} from "react-router-dom";

/**
 * Carte d'un jeu de hasard (page Hasard, liste des machines à sous) : icône à gauche, nom, phrase et étiquettes.
 * L'icône pas encore dessinée laisse une case en pointillés. Sans lien : carte « bientôt ».
 * Styles dans Hasard.scss (sous .hasard).
 */

// Étiquette d'une carte : gain possible (doré) ou jeu en direct / joueurs en ce moment (vert)
export type GameTag = { text: ReactNode; kind: "gain" | "live" };

type GameCardProps = {
    to?: string;
    icon: string;
    name: string;
    text: string;
    tags?: GameTag[];
};

export default function GameCard({to, icon, name, text, tags = []}: GameCardProps) {
    const [noIcon, setNoIcon] = useState(false);
    const body = (
        <>
            <span className="hasard-game-icon">
                {!noIcon && <img src={icon} alt="" draggable={false} onError={() => setNoIcon(true)}/>}
            </span>
            <span className="hasard-game-body">
                <strong>{name}</strong>
                <span className="hasard-game-text">{text}</span>
                {tags.length > 0 && (
                    <span className="hasard-game-tags">
                        {tags.map((t, i) => <span key={i} className={`hasard-game-tag ${t.kind}`}>{t.text}</span>)}
                    </span>
                )}
            </span>
        </>
    );
    return to ? <Link to={to} className="hasard-game">{body}</Link> : <div className="hasard-game soon" aria-disabled>{body}</div>;
}
