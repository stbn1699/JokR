import {useEffect, useState} from "react";
import {queensService} from "../../Services/queens.service.ts";
import type {QueensSettings} from "../../Models/queens.model.ts";
import GameSettingsPopup from "../PuzzleUI/GameSettingsPopup.tsx";

type QueensSettingsPopupProps = {
    open: boolean;
    onGenerate: (size: number, hints: number) => void;
    // Partie en cours à reprendre, s'il y en a une
    resume?: { elapsedMs: number; onResume: () => void };
};

/**
 * Paramètres d'une partie de Queens : taille de la grille et nombre de dames déjà placées en aide.
 * La plage de dames données dépend de la taille ; limites et XP viennent du serveur.
 */
export default function QueensSettingsPopup({open, onGenerate, resume}: QueensSettingsPopupProps) {
    const [settings, setSettings] = useState<QueensSettings | null>(null);
    const [size, setSize] = useState(0);
    const [hints, setHints] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        queensService.getSettings(controller.signal)
            .then((s) => {
                const defaults = s.sizes.find(x => x.size === s.defaultSize) ?? s.sizes[0];
                setSettings(s);
                if (defaults) {
                    setSize(defaults.size);
                    setHints(defaults.defaultHints);
                }
            })
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError("Impossible de charger les paramètres du Queens.");
            });
        return () => controller.abort();
    }, []);

    const current = settings?.sizes.find(s => s.size === size);

    // Nouvelle taille : on repart du nombre de dames conseillé pour cette taille
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
            amountLabel="Dames déjà placées"
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
