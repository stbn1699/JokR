import {useEffect, useState} from "react";
import {traceService} from "../../Services/trace.service.ts";
import type {TraceSettings} from "../../Models/trace.model.ts";
import GameSettingsPopup from "../PuzzleUI/GameSettingsPopup.tsx";

type TraceSettingsPopupProps = {
    open: boolean;
    onGenerate: (size: number, hints: number) => void;
    // Partie en cours à reprendre, s'il y en a une
    resume?: { elapsedMs: number; onResume: () => void };
};

/**
 * Paramètres d'une partie de Tracé : taille de la grille et numéros donnés en plus (aide).
 * La plage dépend de la taille ; limites et XP viennent du serveur.
 */
export default function TraceSettingsPopup({open, onGenerate, resume}: TraceSettingsPopupProps) {
    const [settings, setSettings] = useState<TraceSettings | null>(null);
    const [size, setSize] = useState(0);
    const [hints, setHints] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        traceService.getSettings(controller.signal)
            .then((s) => {
                const defaults = s.sizes.find(x => x.size === s.defaultSize) ?? s.sizes[0];
                setSettings(s);
                if (defaults) {
                    setSize(defaults.size);
                    setHints(defaults.defaultHints);
                }
            })
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError("Impossible de charger les paramètres du Tracé.");
            });
        return () => controller.abort();
    }, []);

    const current = settings?.sizes.find(s => s.size === size);

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
            amountLabel="Numéros en plus"
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
