/**
 * Catalogue des cosmétiques, partagé par la boutique (ShopPage) et la page Personnaliser (CustomizePage) :
 * les catégories (dégradés, billes, jetons, effets…) avec, pour chaque objet, sa vignette et son grand aperçu,
 * et la mise en place d'un objet possédé (equip).
 */

import type {ReactNode} from "react";
import {shopService} from "../../Services/shop.service.ts";
import {
    ANIMATED_BACKGROUNDS,
    ANIMATED_PRICE,
    DEFAULT_BACKGROUND,
    DEFAULT_PATTERN_COLORS,
    GRADIENT_PRICE,
    GRADIENTS,
    gradientCss,
    PATTERN_COLOR_PRICE,
    PATTERN_COLORS,
    PATTERN_PRICE,
    patternCss,
    PATTERNS,
    TIER_GRADIENTS,
} from "../../Services/shopCatalog.ts";
import {DEFAULT_BALL_ID, setMyPlinkoBall, usePlinkoBalls} from "../../Services/plinkoBalls.ts";
import {CHIP_VALUES} from "../../Services/chips.ts";
import {DEFAULT_CHIP_SET_ID, setMyChipSet, useChipSets} from "../../Services/chipSets.ts";
import {imageCss, useImageBackgrounds} from "../../Services/imageBackgrounds.ts";
import {DEFAULT_VICTORY_ID, setMyVictoryEffect, VICTORY_EFFECTS, VICTORY_PRICE} from "../../Services/victoryEffects.ts";
import {IMAGE_VEIL} from "./SiteBackground.tsx";
import {Previews} from "./ShopPreviews.tsx";
import PlinkoPreview from "./PlinkoPreview.tsx";
import AnimatedBackground from "./AnimatedBackground.tsx";
import {VictoryPreview, VictoryThumb} from "./VictoryArt.tsx";
import ChipStack from "../Hasard/Roulette/ChipStack.tsx";
import {Mosaic} from "./ShopArt.tsx";
import {UPGRADES} from "../../../backend/src/utils/upgrades.ts";
import {GameIcon, UpgradeIcon} from "./UpgradeArt.tsx";
import {UPGRADE_SECTIONS} from "../../Services/upgrades.ts";

// ce que l'objet personnalise (pour l'utiliser une fois acheté)
// (pattern : un motif, à porter avec deux couleurs ; color : une couleur de motif)
export type Kind = "background" | "pattern" | "color" | "ball" | "chips" | "victory" | "upgrade";

export type Item = {
    id: string;
    name: string;
    price: number;
    // couleur de palier : débloquée par le niveau, jamais achetée
    minLevel?: number;
    // offert à tout le monde (fond par défaut, bille et jetons classiques)
    free?: boolean;
    // pas encore en vente
    soon?: boolean;
    thumb: ReactNode;
    preview: ReactNode;
    description?: string;
    // collection de l'objet, quand il est montré avec ceux des autres collections (« Tous les fonds »)
    collection?: string;
};

// Une collection d'objets (Dégradés, Billes pastel…) ; les jetons et les machines à sous n'en ont qu'une
export type Category = {
    key: string;
    section: SectionKey;
    name: string;
    hint: string;
    // petite image de la collection (et de la rubrique), dans la colonne de gauche
    cover: ReactNode;
    kind: Kind;
    items: Item[];
    // vignettes au format des images (drapeaux) plutôt que carrées
    wide?: boolean;
    // collection annoncée, pas encore ouverte
    soon?: boolean;
};

// Les rubriques de la boutique
export type SectionKey = "fonds" | "plinko" | "jetons" | "victoire" | "ameliorations" | "ameliorations-plinko" | "ameliorations-keno"
    | "ameliorations-roulette" | "ameliorations-loterie" | "ameliorations-roue" | "ameliorations-boutique";

// Piles de l'aperçu des jetons, comme sur le tapis pendant une partie
const SAMPLE_STACKS = [[10, 10, 10, 10, 10], [50, 20, 10], [100], [500, 200, 100, 50]];

// ---------- Catalogue : les catégories des deux boutiques, avec leurs objets

export function buildCategories(
    imageSets: ReturnType<typeof useImageBackgrounds>,
    balls: ReturnType<typeof usePlinkoBalls>,
    chipSets: ReturnType<typeof useChipSets>,
): Category[] {
    const gradientItem = (gr: typeof GRADIENTS[number], extra: Partial<Item> = {}): Item => ({
        id: gr.id,
        name: gr.name,
        price: GRADIENT_PRICE,
        thumb: <span className="shop-art-fill" style={{background: gradientCss(gr)}}/>,
        preview: <Previews background={gradientCss(gr)}/>,
        ...extra,
    });

    const categories: Category[] = [
        {
            key: "fonds/degrades", section: "fonds", name: "Dégradés", kind: "background",
            hint: `Le fond de tout le site · ${GRADIENT_PRICE} crédits chacun`,
            cover: <Mosaic layers={GRADIENTS.slice(0, 6).map(gradientCss)}/>,
            items: [gradientItem(DEFAULT_BACKGROUND, {price: 0, free: true}), ...GRADIENTS.map(gr => gradientItem(gr))],
        },
        {
            key: "fonds/niveaux", section: "fonds", name: "Couleurs de niveau", kind: "background",
            hint: "Gratuites : chaque palier de ton contour de profil débloque son dégradé",
            cover: <Mosaic layers={TIER_GRADIENTS.slice(1, 7).map(gradientCss)}/>,
            items: TIER_GRADIENTS.map(gr => gradientItem(gr, {price: 0, minLevel: gr.minLevel, description: `Palier du niveau ${gr.minLevel}.`})),
        },
    ];

    for (const set of imageSets ?? []) {
        categories.push({
            key: `fonds/${set.set}`, section: "fonds", name: set.name, kind: "background", wide: true,
            hint: `${set.backgrounds.length} fonds en images · ${set.price} crédits chacun`,
            cover: <Mosaic grid layers={set.backgrounds.slice(0, 6).map(b => imageCss(b.file))}/>,
            items: set.backgrounds.map(b => ({
                id: b.id,
                name: b.name,
                price: b.price,
                thumb: <span className="shop-art-fill" style={{background: imageCss(b.file)}}/>,
                preview: <Previews background={`${IMAGE_VEIL}, ${imageCss(b.file)}`}/>,
            })),
        });
    }

    // Fonds animés : leur animation dans la vignette et dans les aperçus (voir AnimatedBackground)
    categories.push({
        key: "fonds/animes", section: "fonds", name: "Fonds animés", kind: "background",
        hint: `Le fond bouge doucement · ${ANIMATED_PRICE} crédits chacun`,
        cover: <Mosaic layers={ANIMATED_BACKGROUNDS.map(a => a.base)}/>,
        items: ANIMATED_BACKGROUNDS.map(a => ({
            id: a.id,
            name: a.name,
            price: ANIMATED_PRICE,
            description: a.description,
            thumb: <AnimatedBackground id={a.id} className="shop-art-fill"/>,
            preview: <Previews backdrop={<AnimatedBackground id={a.id}/>}/>,
        })),
    });

    // Motifs et leurs couleurs : un motif se porte avec deux couleurs (voir PatternsView)
    categories.push({
        key: "fonds/motifs", section: "fonds", name: "Motifs", kind: "pattern",
        hint: `Choisis un motif et ses deux couleurs · ${PATTERN_PRICE} crédits le motif`,
        cover: <span className="shop-art-fill" style={{background: patternCss("losanges", "indigo", "nuit", {size: 12, veil: false})}}/>,
        items: PATTERNS.map(pattern => ({
            id: pattern.id,
            name: pattern.name,
            price: PATTERN_PRICE,
            thumb: <span className="shop-art-fill" style={{background: patternCss(pattern.slug, ...DEFAULT_PATTERN_COLORS, {size: 22})}}/>,
            preview: <Previews background={patternCss(pattern.slug, ...DEFAULT_PATTERN_COLORS, {size: 14})}/>,
        })),
    });
    categories.push({
        key: "fonds/couleurs", section: "fonds", name: "Couleurs des motifs", kind: "color",
        hint: `À combiner dans les motifs · ${PATTERN_COLOR_PRICE} crédits chacune, Nuit et Ardoise offertes`,
        cover: <Mosaic layers={["rubis", "ambre", "emeraude", "ciel", "violet", "rose"].map(slug => PATTERN_COLORS.find(c => c.slug === slug)!.hex)}/>,
        items: PATTERN_COLORS.map(color => ({
            id: color.id,
            name: color.name,
            price: color.free ? 0 : PATTERN_COLOR_PRICE,
            free: color.free,
            description: "Une couleur pour les fonds à motifs : en fond ou pour le motif.",
            thumb: <span className="shop-art-fill" style={{background: color.hex}}/>,
            // la couleur en motif, puis en fond, avec une couleur offerte qui la fait ressortir
            preview: (
                <div className="shop-color-preview">
                    <span className="shop-color-big" style={{background: color.hex}}/>
                    {(["rayures", "pois", "losanges"] as const).map((slug, i) => {
                        const partner = color.slug === "nuit" ? "ardoise" : "nuit";
                        return (
                            <span key={slug} style={{background: i === 1
                                ? patternCss(slug, color.slug, partner, {size: 18, veil: false})
                                : patternCss(slug, partner, color.slug, {size: 18, veil: false})}}/>
                        );
                    })}
                </div>
            ),
        })),
    });

    for (const set of balls?.sets ?? []) {
        categories.push({
            key: `plinko/${set.set}`, section: "plinko", name: `Billes ${set.name.toLowerCase()}`, kind: "ball",
            hint: set.balls.some(b => b.price > 0) ? `La bille lâchée au Plinko · ${set.price} crédits chacune` : "La bille lâchée au Plinko",
            cover: <span className="shop-art-balls">{set.balls.slice(0, 6).map(b => <img key={b.id} src={b.file} alt=""/>)}</span>,
            items: set.balls.map(b => ({
                id: b.id,
                name: b.name,
                price: b.price,
                free: b.id === DEFAULT_BALL_ID || b.price === 0,
                thumb: <span className="shop-art-ball"><img src={b.file} alt=""/></span>,
                // une nouvelle disposition des billes à chaque couleur
                preview: <PlinkoPreview key={b.id} balls={[b.file]} className="shop-plinko-preview"/>,
            })),
        });
    }

    // Effets de victoire : joués en fin de grille ; la fiche permet de les voir en vrai
    categories.push({
        key: "victoire", section: "victoire", name: "Effets de victoire", kind: "victory",
        hint: `Ce qui se passe à l'écran quand tu termines une grille · ${VICTORY_PRICE} crédits chacun, les confettis offerts`,
        cover: <VictoryThumb slug="artifice" className="shop-art-fill"/>,
        items: VICTORY_EFFECTS.map(effect => ({
            id: effect.id,
            name: effect.name,
            price: effect.free ? 0 : VICTORY_PRICE,
            free: effect.free,
            description: effect.description,
            thumb: <VictoryThumb slug={effect.slug} className="shop-art-fill"/>,
            preview: <VictoryPreview id={effect.id} slug={effect.slug}/>,
        })),
    });

    if (chipSets) {
        const classic = chipSets.sets.find(s => s.id === DEFAULT_CHIP_SET_ID) ?? chipSets.sets[0];
        categories.push({
            key: "jetons", section: "jetons", name: "Jetons", kind: "chips",
            hint: "Le jeu de six jetons de la roulette et des mises du Plinko",
            cover: <span className="shop-art-icon"><img src={classic?.chips["100"]} alt=""/></span>,
            items: chipSets.sets.map(set => ({
                id: set.id,
                name: set.name,
                price: set.price,
                free: set.price === 0,
                description: "Les six jetons, utilisés à la roulette (tapis et mises) et au Plinko (mises).",
                thumb: (
                    <span className="shop-art-chips">
                        {CHIP_VALUES.map(v => <img key={v} src={set.chips[String(v)]} alt=""/>)}
                    </span>
                ),
                preview: (
                    <div className="shop-chip-felt">
                        <div className="shop-chip-row">
                            {CHIP_VALUES.map(v => <img key={v} src={set.chips[String(v)]} alt={`Jeton de ${v}`}/>)}
                        </div>
                        <div className="shop-chip-stacks">
                            {SAMPLE_STACKS.map((chips, i) => (
                                <span key={i} className="shop-chip-stack-slot">
                                    <ChipStack chips={chips} set={set.id} style={{left: "50%", top: "50%"}}/>
                                </span>
                            ))}
                        </div>
                    </div>
                ),
            })),
        });
    }

    // Améliorations : ce qui change le jeu lui-même, une rubrique par jeu ; chaque objet est une amélioration
    // (ses niveaux s'achètent l'un après l'autre, voir UpgradesView)
    for (const section of UPGRADE_SECTIONS) {
        categories.push({
            key: section.key, section: section.key as SectionKey, name: section.name, kind: "upgrade",
            hint: "Chaque amélioration se monte niveau par niveau",
            cover: <GameIcon game={section.game}/>,
            items: UPGRADES.filter(u => u.game === section.game).map(u => ({
                id: u.id,
                name: u.name,
                price: u.levels[0]!.price,
                description: u.description,
                thumb: <UpgradeIcon id={u.id}/>,
                preview: <div className="shop-reels-stage"><UpgradeIcon id={u.id} value={u.levels.at(-1)!.value} big/></div>,
            })),
        });
    }

    return categories;
}

/*
 * Met en place un objet possédé : le fond (setBackground : celui de la session), la bille, les jetons
 * ou l'effet de victoire. Le serveur vérifie qu'on le possède.
 */
export async function equip(kind: Kind, id: string, setBackground: (id: string | null) => void) {
    if (kind === "background") {
        const background = id === DEFAULT_BACKGROUND.id ? null : id;
        await shopService.setBackground(background);
        setBackground(background);
    } else if (kind === "ball") {
        await shopService.setPlinkoBall(id === DEFAULT_BALL_ID ? null : id);
        setMyPlinkoBall(id);
    } else if (kind === "chips") {
        await shopService.setChipSet(id === DEFAULT_CHIP_SET_ID ? null : id);
        setMyChipSet(id);
    } else if (kind === "victory") {
        await shopService.setVictoryEffect(id === DEFAULT_VICTORY_ID ? null : id);
        setMyVictoryEffect(id);
    }
}
