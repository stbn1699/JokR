import {describe, expect, it} from "vitest";
import {isDateKey, isUuid, routeParam} from "./validation.js";

describe("isUuid", () => {
    it("accepte un UUID", () => {
        expect(isUuid("2e63f9f6-3c03-44b2-9aaf-0eeeb0b7b920")).toBe(true);
        expect(isUuid("2E63F9F6-3C03-44B2-9AAF-0EEEB0B7B920")).toBe(true);
    });

    it("refuse le reste", () => {
        expect(isUuid("abc")).toBe(false);
        expect(isUuid("")).toBe(false);
        expect(isUuid("2e63f9f6-3c03-44b2-9aaf-0eeeb0b7b920; drop table users")).toBe(false);
    });
});

describe("routeParam", () => {
    it("renvoie un paramètre string, undefined sinon", () => {
        expect(routeParam({id: "42"}, "id")).toBe("42");
        expect(routeParam({id: ["1", "2"]}, "id")).toBeUndefined();
        expect(routeParam({}, "id")).toBeUndefined();
    });
});

describe("isDateKey", () => {
    it("accepte une date AAAA-MM-JJ qui existe", () => {
        expect(isDateKey("2026-10-31")).toBe(true);
        expect(isDateKey("2024-02-29")).toBe(true);
    });

    it("refuse un autre format ou une date impossible", () => {
        expect(isDateKey("31/10/2026")).toBe(false);
        expect(isDateKey("2026-02-30")).toBe(false);
        expect(isDateKey("2026-13-01")).toBe(false);
        expect(isDateKey("2026-10-31; drop table")).toBe(false);
    });
});
