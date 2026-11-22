import {useEffect, useState} from "react";
import GameSettingsPopup from "../PuzzleUI/GameSettingsPopup.tsx";
import type {WordGameSettings} from "../../Models/wordGames.model.ts";

type WordSettingsPopupProps = {
    open: boolean;
    load: (signal?: AbortSignal) => Promise<WordGameSettings>;
    onGenerate: (size: number, amount: number) => void;
    resume?: { elapsedMs: number; onResume: () => void };
    sizeLegend: string;
    sizeLabel: (size: number) => string;
    amountLabel: string;
    easierWhenHigher?: boolean;
};

// Paramètres d'une partie de jeu de mots : une taille et un curseur (essais, étapes ou mots à trouver)
export default function WordSettingsPopup({open, load, onGenerate, resume, sizeLegend, sizeLabel, amountLabel, easierWhenHigher}: WordSettingsPopupProps) {
    const [settings, setSettings] = useState<WordGameSettings | null>(null);
    const [size, setSize] = useState(0);
    const [amount, setAmount] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal)
            .then(s => {
                const defaults = s.sizes.find(x => x.size === s.defaultSize) ?? s.sizes[0];
                setSettings(s);
                if (defaults) {
                    setSize(defaults.size);
                    setAmount(defaults.default);
                }
            })
            .catch((err: Error) => {
                if (err.name !== "AbortError") setError("Impossible de charger les paramètres du jeu.");
            });
        return () => controller.abort();
    }, [load]);

    const current = settings?.sizes.find(s => s.size === size);

    const changeSize = (next: number) => {
        const limits = settings?.sizes.find(s => s.size === next);
        if (!limits) return;
        setSize(next);
        setAmount(limits.default);
    };

    return (
        <GameSettingsPopup
            open={open}
            loading={!current}
            error={error}
            sizes={settings?.sizes.map(s => s.size)}
            size={size}
            onSizeChange={changeSize}
            sizeLegend={sizeLegend}
            sizeLabel={sizeLabel}
            amountLabel={amountLabel}
            easierWhenHigher={easierWhenHigher}
            emptyCells={amount}
            minEmptyCells={current?.min ?? 0}
            maxEmptyCells={current?.max ?? 0}
            onEmptyCellsChange={setAmount}
            xp={current?.xpByAmount[amount]}
            credits={current?.creditsByAmount[amount]}
            onGenerate={() => onGenerate(size, amount)}
            resume={resume}
        />
    );
}
