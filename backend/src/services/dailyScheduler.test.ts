import {afterEach, describe, expect, it, vi} from "vitest";
import {startDailyScheduler} from "./dailyScheduler.js";
import type {DailyService} from "./Daily.service.js";

describe("startDailyScheduler", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("génère les défis au démarrage, puis à minuit heure de Paris", async () => {
        vi.useFakeTimers();
        // 23h50 à Paris le 1er novembre
        vi.setSystemTime(new Date("2026-11-01T22:50:00Z"));
        const generateAll = vi.fn(async () => []);
        const stop = startDailyScheduler({generateAll} as unknown as DailyService, () => undefined);

        await vi.advanceTimersByTimeAsync(0);
        expect(generateAll).toHaveBeenLastCalledWith("2026-11-01");

        // 23h59 : rien de plus
        await vi.advanceTimersByTimeAsync(9 * 60 * 1000);
        expect(generateAll).toHaveBeenCalledTimes(1);

        // Minuit passé : défis du 2 novembre
        await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
        expect(generateAll).toHaveBeenCalledTimes(2);
        expect(generateAll).toHaveBeenLastCalledWith("2026-11-02");

        // Et ainsi de suite le lendemain
        await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
        expect(generateAll).toHaveBeenLastCalledWith("2026-11-03");
        stop();
    });

    it("réessaie une minute plus tard si la génération échoue", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
        vi.spyOn(console, "error").mockImplementation(() => undefined);
        const generateAll = vi.fn()
            .mockRejectedValueOnce(new Error("base indisponible"))
            .mockResolvedValue([]);
        const stop = startDailyScheduler({generateAll} as unknown as DailyService, () => undefined);

        await vi.advanceTimersByTimeAsync(0);
        expect(generateAll).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(60 * 1000);
        expect(generateAll).toHaveBeenCalledTimes(2);
        stop();
    });
});
