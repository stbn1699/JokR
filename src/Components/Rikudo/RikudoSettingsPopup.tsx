import {useEffect, useState} from "react";
import {rikudoService} from "../../Services/rikudo.service.ts";
import type {RikudoSettings} from "../../Models/rikudo.model.ts";
import GameSettingsPopup from "../PuzzleUI/GameSettingsPopup.tsx";

type RikudoSettingsPopupProps = {
    open: boolean;
    onGenerate: (size: number, emptyCells: number) => void;
    // Partie en cours à reprendre, s'il y en a une
    resume?: { elapsedMs: number; onResume: () => void };
};

/**
 * Paramètres d'une partie de Rikudo : taille du plateau (36, 60 ou 90 cases) et nombre de cases à remplir.
 * La plage de cases à remplir dépend de la taille ; limites et XP viennent du serveur.
 */
export default function RikudoSettingsPopup({open, onGenerate, resume}: RikudoSettingsPopupProps) {
    const [settings, setSettings] = useState<RikudoSettings | null>(null);
    const [size, setSize] = useState(0);
    const [emptyCells, setEmptyCells] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        rikudoService.getSettings(controller.signal)
            .then((s) => {
                const defaults = s.sizes.find(x => x.size === s.defaultSize) ?? s.sizes[0];
                setSettings(s);
                if (defaults) {
                    setSize(defaults.size);
                    setEmptyCells(defaults.defaultEmptyCells);
                }
            })
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError("Impossible de charger les paramètres du Rikudo.");
            });
        return () => controller.abort();
    }, []);

    const current = settings?.sizes.find(s => s.size === size);

    const changeSize = (newSize: number) => {
        const limits = settings?.sizes.find(s => s.size === newSize);
        if (!limits) return;
        setSize(newSize);
        setEmptyCells(limits.defaultEmptyCells);
    };

    return (
        <GameSettingsPopup
            open={open}
            loading={!current}
            error={error}
            sizes={settings?.sizes.map(s => s.size)}
            sizeLegend="Taille du plateau"
            sizeLabel={s => `${s} cases`}
            size={size}
            onSizeChange={changeSize}
            emptyCells={emptyCells}
            minEmptyCells={current?.minEmptyCells ?? 0}
            maxEmptyCells={current?.maxEmptyCells ?? 0}
            onEmptyCellsChange={setEmptyCells}
            xp={current?.xpByEmptyCells[emptyCells]}
            onGenerate={() => onGenerate(size, emptyCells)}
            resume={resume}
        />
    );
}
