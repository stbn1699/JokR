/**
 * Stylo du header (à côté des notifications) : les personnalisations que le joueur a, à appliquer d'un clic.
 * - Fond du site : fond par défaut, couleurs de niveau débloquées et dégradés achetés
 * - Bille de Plinko : la bille par défaut et les billes achetées
 * - Jetons : les jetons classiques et les jeux achetés
 * Chaque section a un lien vers la boutique pour en avoir d'autres.
 */

import "./Customize.scss";
import {useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {FaCheck, FaPen, FaTimes} from "react-icons/fa";
import {useAuth} from "../../Context/authContext.ts";
import {ApiError} from "../../api/api.ts";
import {shopService} from "../../Services/shop.service.ts";
import {DEFAULT_BACKGROUND, gradientCss, usableBackgrounds} from "../../Services/shopCatalog.ts";
import {DEFAULT_BALL_ID, setMyPlinkoBall, useMyPlinkoBall, usePlinkoBalls} from "../../Services/plinkoBalls.ts";
import {chipFile, DEFAULT_CHIP_SET_ID, setMyChipSet, useChipSets, useMyChipSet} from "../../Services/chipSets.ts";
import {imageCss, useImageBackgrounds} from "../../Services/imageBackgrounds.ts";

export default function CustomizeButton() {
    const auth = useAuth();
    const [open, setOpen] = useState(false);
    const [owned, setOwned] = useState<string[]>([]);
    // personnalisation en cours d'application (ex. « bg:gradient-lave », « ball:… », « chips:… »)
    const [pending, setPending] = useState<string | null>(null);
    const ballCatalog = usePlinkoBalls();
    const myBall = useMyPlinkoBall();
    const chipCatalog = useChipSets();
    const imageSets = useImageBackgrounds();
    const myChips = useMyChipSet();
    const [error, setError] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // Objets possédés, relus à chaque ouverture (un achat a pu se faire entre-temps)
    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        shopService.state(controller.signal).then(s => setOwned(s.owned)).catch(() => undefined);

        const onClick = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            controller.abort();
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    // applique une personnalisation (une seule à la fois)
    async function apply(key: string, action: () => Promise<void>) {
        if (pending !== null) return;
        setPending(key);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Une erreur est survenue, réessaie.");
        } finally {
            setPending(null);
        }
    }

    const applyBackground = (id: string | null) => id !== auth.background && apply(`bg:${id}`, async () => {
        await shopService.setBackground(id);
        auth.setBackground(id);
    });

    const applyBall = (id: string) => id !== myBall && apply(id, async () => {
        await shopService.setPlinkoBall(id === DEFAULT_BALL_ID ? null : id);
        setMyPlinkoBall(id);
    });

    const applyChips = (id: string) => id !== myChips && apply(id, async () => {
        await shopService.setChipSet(id === DEFAULT_CHIP_SET_ID ? null : id);
        setMyChipSet(id);
    });

    // fonds : par défaut, couleurs de niveau, dégradés achetés, puis fonds en images achetés (drapeaux…)
    const backgrounds = [
        ...usableBackgrounds(owned, auth.level).map(gr => ({id: gr === DEFAULT_BACKGROUND ? null : gr.id, name: gr.name, css: gradientCss(gr)})),
        ...(imageSets ?? []).flatMap(set => set.backgrounds).filter(b => owned.includes(b.id))
            .map(b => ({id: b.id as string | null, name: b.name, css: imageCss(b.file)})),
    ];
    // billes et jetons possédés (la bille par défaut et les jetons classiques sont offerts)
    const balls = ballCatalog?.sets.flatMap(set => set.balls.map(b => ({...b, setName: set.name})))
        .filter(b => b.id === DEFAULT_BALL_ID || owned.includes(b.id)) ?? [];
    const chipSets = chipCatalog?.sets.filter(set => set.price === 0 || owned.includes(set.id)) ?? [];

    return (
        <div className="notifications customize" ref={rootRef}>
            <button type="button" className="notif-bell" aria-label="Personnalisation" title="Personnalisation"
                    aria-expanded={open} onClick={() => setOpen(o => !o)}>
                <FaPen aria-hidden/>
            </button>

            {open && (
                <div className="notif-panel customize-panel" role="dialog" aria-label="Personnalisation">
                    <div className="notif-panel-head">
                        <strong>Personnalisation</strong>
                        <button type="button" className="notif-close" aria-label="Fermer" onClick={() => setOpen(false)}>
                            <FaTimes aria-hidden/>
                        </button>
                    </div>

                    <div className="customize-body">
                        <h3>Fond du site</h3>
                        <div className="customize-swatches">
                            {backgrounds.map(gr => {
                                const id = gr.id;
                                const worn = id === auth.background;
                                return (
                                    <button key={id ?? "defaut"} type="button" title={gr.name} aria-pressed={worn}
                                            className={`customize-swatch ${worn ? "worn" : ""} ${pending === `bg:${id}` ? "pending" : ""}`}
                                            onClick={() => void applyBackground(id)}>
                                        <span className="customize-swatch-color" style={{background: gr.css}}>
                                            {worn && <FaCheck aria-hidden/>}
                                        </span>
                                        <span>{gr.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <Link to="/boutique/fonds/degrades" className="customize-shop" onClick={() => setOpen(false)}>
                            Plus de fonds dans la boutique
                        </Link>

                        <h3>Bille de Plinko</h3>
                        <div className="customize-swatches balls">
                            {balls.map(b => {
                                const worn = b.id === myBall;
                                return (
                                    <button key={b.id} type="button" title={`${b.name} (${b.setName.toLowerCase()})`} aria-pressed={worn}
                                            className={`customize-swatch ${worn ? "worn" : ""} ${pending === b.id ? "pending" : ""}`}
                                            onClick={() => void applyBall(b.id)}>
                                        <span className="customize-swatch-color customize-ball">
                                            <img src={b.file} alt=""/>
                                            {worn && <FaCheck aria-hidden/>}
                                        </span>
                                        <span>{b.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <Link to="/boutique" className="customize-shop" onClick={() => setOpen(false)}>Plus de billes dans la boutique</Link>

                        <h3>Jetons</h3>
                        <div className="customize-swatches">
                            {chipSets.map(set => {
                                const worn = set.id === myChips;
                                return (
                                    <button key={set.id} type="button" title={`Jetons ${set.name.toLowerCase()}`} aria-pressed={worn}
                                            className={`customize-swatch ${worn ? "worn" : ""} ${pending === set.id ? "pending" : ""}`}
                                            onClick={() => void applyChips(set.id)}>
                                        <span className="customize-swatch-color customize-chip">
                                            <img src={chipFile(100, set.id, chipCatalog)} alt=""/>
                                            {worn && <FaCheck aria-hidden/>}
                                        </span>
                                        <span>{set.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {error && <p className="customize-error" role="alert">{error}</p>}
                        <Link to="/boutique" className="customize-shop" onClick={() => setOpen(false)}>Plus de jetons dans la boutique</Link>
                    </div>
                </div>
            )}
        </div>
    );
}
