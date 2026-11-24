import {describe, expect, it} from "vitest";
import {joinPronouns, splitPronouns} from "./pronouns.ts";

describe("pronoms", () => {
    it("combine les pronoms français avec « / » et les autres avec « , »", () => {
        expect(joinPronouns(["elle", "iel"])).toBe("elle/iel");
        expect(joinPronouns(["she/her", "they/them"])).toBe("she/her, they/them");
        expect(joinPronouns(["iel", "tous les pronoms"])).toBe("iel, tous les pronoms");
    });

    it("retrouve les pronoms de la liste, ou null pour un texte écrit à la main", () => {
        expect(splitPronouns("")).toEqual([]);
        expect(splitPronouns("elle/iel")).toEqual(["elle", "iel"]);
        expect(splitPronouns("he/him")).toEqual(["he/him"]);
        expect(splitPronouns("she/her, they/them")).toEqual(["she/her", "they/them"]);
        expect(splitPronouns("iel, tous les pronoms")).toEqual(["iel", "tous les pronoms"]);
        expect(splitPronouns("she/they")).toBeNull();
        expect(splitPronouns("elle, iel")).toBeNull();
        expect(splitPronouns("il/elle/iel/ul")).toBeNull();
    });
});
