import {useEffect, useState} from "react";
import {galaxiesService} from "../../Services/galaxies.service.ts";
import type {GalaxiesSettings} from "../../Models/galaxies.model.ts";
import GameSettingsPopup from "../PuzzleUI/GameSettingsPopup.tsx";

type GalaxiesSettingsPopupProps = {
    open: boolean;
    onGenerate: (size: number, hints: number) => void;
    // Partie en cours à reprendre, s'il y en a une
    resume?: { elapsedMs: number; onResume: () => void };
};

/**
 * Paramètres d'une partie de Galaxies : taille de la grille et nombre de murs déjà tracés en aide.
 * La plage de murs donnés dépend de la taille ; limites et XP viennent du serveur.
 */
export default function GalaxiesSettingsPopup({open, onGenerate, resume}: GalaxiesSettingsPopupProps) {
    const [settings, setSettings] = useState<GalaxiesSettings | null>(null);
    const [size, setSize] = useState(0);
    const [hints, setHints] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        galaxiesService.getSettings(controller.signal)
            .then((s) => {
                const defaults = s.sizes.find(x => x.size === s.defaultSize) ?? s.sizes[0];
                setSettings(s);
                if (defaults) {
                    setSize(defaults.size);
                    setHints(defaults.defaultHints);
                }
            })
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError("Impossible de charger les paramètres des Galaxies.");
            });
        return () => controller.abort();
    }, []);

    const current = settings?.sizes.find(s => s.size === size);

    // Nouvelle taille : on repart du nombre de murs conseillé pour cette taille
    const changeSize = (newSize: number) => {
        const limits = settings?.sizes.find(s => s.size === newSize);
        if (!limits) return;
        setSize(newSize);
        setHints(limits.defaultHints);
    };

    return (
        <GameSettingsPopup
            open={open}
            loading={!current}
            error={error}
            sizes={settings?.sizes.map(s => s.size)}
            size={size}
            onSizeChange={changeSize}
            amountLabel="Murs déjà tracés"
            easierWhenHigher
            emptyCells={hints}
            minEmptyCells={current?.minHints ?? 0}
            maxEmptyCells={current?.maxHints ?? 0}
            onEmptyCellsChange={setHints}
            xp={current?.xpByHints[hints]}
            credits={current?.creditsByHints[hints]}
            onGenerate={() => onGenerate(size, hints)}
            resume={resume}
        />
    );
}
