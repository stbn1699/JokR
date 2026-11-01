/**
 * Page « Nouveautés » (/nouveautes) : contenu de CHANGELOG.md, de la version la plus récente à la plus ancienne.
 */

import "./Changelog.scss";
import {useLocation, useNavigate} from "react-router-dom";
import changelog from "../../../CHANGELOG.md?raw";
import {parseChangelog} from "./parseChangelog.ts";

const versions = parseChangelog(changelog);

export default function Changelog() {
    const navigate = useNavigate();
    // Arrivé directement sur la page (lien partagé, rafraîchissement) : pas de page précédente dans le site
    const hasPrevious = useLocation().key !== "default";

    return (
        <main className="changelog">
            <div className="changelog-column">
                <button type="button" className="changelog-back" onClick={() => (hasPrevious ? navigate(-1) : navigate("/"))}>
                    ← Retour
                </button>
                <section className="changelog-card">
                    <h1>Nouveautés</h1>
                    <p className="changelog-current">Version actuelle : {__APP_VERSION__}</p>

                    {versions.map(v => (
                        <article key={v.version} className="changelog-version">
                            <h2>
                                Version {v.version}
                                {v.date && <span className="changelog-date">{v.date}</span>}
                            </h2>
                            {v.intro.map((p, i) => <p key={i} className="changelog-intro">{p}</p>)}
                            {v.sections.map((s, i) => (
                                <div key={i} className="changelog-section">
                                    {s.title && <h3>{s.title}</h3>}
                                    <ul>
                                        {s.items.map((item, j) => <li key={j}>{item}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </article>
                    ))}
                </section>
            </div>
        </main>
    );
}
