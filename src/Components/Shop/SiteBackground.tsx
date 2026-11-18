/**
 * Fond du site choisi dans la boutique : un calque fixé à l'écran, derrière toute la page.
 * - dégradé (ou couleur de niveau) : dessiné en CSS
 * - fond animé (« anim-pluie ») : son fond de base et son animation (AnimatedBackground)
 * - fond à motif (« pat:pois/rubis/nuit ») : le motif en CSS avec ses deux couleurs, sous un voile sombre léger
 * - fond en image (drapeau…) : l'image couvre l'écran, sous un voile sombre léger pour que les textes du site
 *   restent lisibles ; le calque déborde un peu de l'écran pour que les bords flous des images ne se voient pas
 * Sans fond choisi (ou sans session), rien n'est dessiné : on voit le fond par défaut de html (index.css).
 * (Un calque dessiné par React se met à jour à coup sûr ; changer le fond de html en direct
 * n'était pas toujours redessiné par le navigateur.)
 */

import {useAuth} from "../../Context/authContext.ts";
import {findAnimatedBackground, findGradient, gradientCss, parsePatternBackground, patternCss} from "../../Services/shopCatalog.ts";
import AnimatedBackground from "./AnimatedBackground.tsx";
import {findImageBackground, imageCss, isImageBackground, useImageBackgrounds} from "../../Services/imageBackgrounds.ts";

// Voile sombre posé sur les fonds en images
export const IMAGE_VEIL = "linear-gradient(rgba(2, 6, 23, 0.4), rgba(2, 6, 23, 0.4))";

export default function SiteBackground() {
    const {background} = useAuth();
    if (findAnimatedBackground(background)) {
        return <div className="site-background"><AnimatedBackground id={background!}/></div>;
    }
    const pattern = parsePatternBackground(background);
    if (pattern) {
        return <div className="site-background" style={{background: patternCss(pattern.pattern.slug, pattern.color1.slug, pattern.color2.slug)}} aria-hidden/>;
    }
    return isImageBackground(background) ? <ImageLayer id={background!}/> : <GradientLayer id={background}/>;
}

function GradientLayer({id}: { id: string | null }) {
    const gradient = findGradient(id);
    if (!gradient) return null;
    return <div className="site-background" style={{background: gradientCss(gradient)}} aria-hidden/>;
}

function ImageLayer({id}: { id: string }) {
    const catalog = useImageBackgrounds();
    const image = findImageBackground(id, catalog);
    if (!image) return null;
    return <div className="site-background image" style={{background: `${IMAGE_VEIL}, ${imageCss(image.file)}`}} aria-hidden/>;
}
