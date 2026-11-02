import {describe, expect, it} from "vitest";
import {daysOfMonth, longDate, monthLabel, monthsBetween, shiftMonth, weekdayShort} from "./calendar.ts";

describe("calendrier des défis", () => {
    it("nomme le mois avec son année", () => {
        expect(monthLabel("2026-11")).toBe("Novembre 2026");
        expect(monthLabel("2027-11")).toBe("Novembre 2027");
    });

    it("passe au mois précédent ou suivant, en changeant d'année", () => {
        expect(shiftMonth("2027-01", -1)).toBe("2026-12");
        expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    });

    it("liste les mois du plus récent au plus ancien", () => {
        expect(monthsBetween("2026-11", "2027-02")).toEqual(["2027-02", "2027-01", "2026-12", "2026-11"]);
        expect(monthsBetween("2026-11", "2026-11")).toEqual(["2026-11"]);
    });

    it("donne tous les jours du mois", () => {
        expect(daysOfMonth("2026-11")).toHaveLength(30);
        expect(daysOfMonth("2028-02")).toHaveLength(29);
        expect(daysOfMonth("2026-11")[0]).toBe("2026-11-01");
    });

    it("écrit les jours en français", () => {
        expect(weekdayShort("2026-11-02")).toBe("lun.");
        expect(longDate("2026-11-02")).toBe("Lundi 2 novembre 2026");
        expect(longDate("2026-11-01")).toBe("Dimanche 1er novembre 2026");
    });
});
