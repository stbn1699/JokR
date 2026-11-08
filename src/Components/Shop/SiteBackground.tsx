/**
 * Fond du site choisi dans la boutique : un calque fixé à l'écran, derrière toute la page.
 * Sans fond choisi (ou sans session), rien n'est dessiné : on voit le fond par défaut de html (index.css).
 * (Un calque dessiné par React se met à jour à coup sûr ; changer le fond de html en direct
 * n'était pas toujours redessiné par le navigateur.)
 */

import {useAuth} from "../../Context/authContext.ts";
import {findGradient, gradientCss} from "../../Services/shopCatalog.ts";

export default function SiteBackground() {
    const {background} = useAuth();
    const gradient = findGradient(background);
    if (!gradient) return null;
    return <div className="site-background" style={{background: gradientCss(gradient)}} aria-hidden/>;
}
