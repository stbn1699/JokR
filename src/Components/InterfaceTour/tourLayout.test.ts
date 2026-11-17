import {afterEach, describe, expect, it, vi} from "vitest";
import {arrowBetween, EDGE, edgePoint, GAP, markTourSeen, nearestArrow, placeBubble, tourKey, tourSeen, unionRect} from "./tourLayout.ts";

const view = {width: 400, height: 800};
const bubble = {width: 300, height: 150};

describe("unionRect", () => {
    it("englobe tous les éléments", () => {
        expect(unionRect([{top: 10, left: 20, width: 30, height: 40}, {top: 100, left: 5, width: 10, height: 10}]))
            .toEqual({top: 10, left: 5, width: 45, height: 100});
    });
});

describe("placeBubble", () => {
    it("pose la bulle sous l'élément, centrée, quand il y a la place", () => {
        const b = placeBubble({top: 100, left: 150, width: 100, height: 50}, bubble, view);
        expect(b.top).toBe(150 + GAP);
        expect(b.left).toBe(50);
    });

    it("la remonte au-dessus d'un élément en bas de l'écran", () => {
        const b = placeBubble({top: 700, left: 150, width: 100, height: 50}, bubble, view);
        expect(b.top).toBe(700 - GAP - bubble.height);
    });

    it("ne la laisse jamais dépasser du bord de l'écran", () => {
        const b = placeBubble({top: 100, left: 360, width: 30, height: 30}, bubble, view);
        expect(b.left).toBe(view.width - bubble.width - EDGE);
    });

    it("la met à côté d'un grand élément s'il y a de la place", () => {
        const b = placeBubble({top: 50, left: 20, width: 400, height: 700}, bubble, {width: 1000, height: 800});
        expect(b.left).toBe(420 + GAP);
    });

    it("la pose en haut, par-dessus, quand il n'y a de place nulle part", () => {
        const b = placeBubble({top: 0, left: 0, width: 400, height: 800}, bubble, view);
        expect(b.top).toBe(EDGE);
    });

    it("sans place, la pose là où elle cache le moins des éléments", () => {
        const holes = [{top: 0, left: 0, width: 400, height: 60}, {top: 300, left: 0, width: 400, height: 500}];
        const b = placeBubble({top: 0, left: 0, width: 400, height: 800}, bubble, view, holes);
        expect(b.top).toBe(EDGE);
        const low = [{top: 0, left: 0, width: 400, height: 400}, {top: 700, left: 0, width: 400, height: 100}];
        expect(placeBubble({top: 0, left: 0, width: 400, height: 800}, bubble, view, low).top).toBe(view.height - bubble.height - EDGE);
    });
});

describe("flèche", () => {
    it("va du bord de la bulle au bord de l'élément", () => {
        const a = arrowBetween({top: 200, left: 0, width: 100, height: 100}, {top: 0, left: 0, width: 100, height: 100});
        expect(a).toEqual({from: {x: 50, y: 200}, to: {x: 50, y: 100}});
    });

    it("n'existe pas quand la bulle est posée sur l'élément", () => {
        expect(arrowBetween({top: 0, left: 0, width: 100, height: 100}, {top: 50, left: 50, width: 100, height: 100})).toBeNull();
    });

    it("ne va qu'à l'élément le plus proche quand il y en a plusieurs", () => {
        const bubble = {top: 400, left: 0, width: 100, height: 100};
        const near = {top: 250, left: 0, width: 100, height: 100}, far = {top: 0, left: 0, width: 100, height: 100};
        expect(nearestArrow(bubble, [far, near])).toEqual({from: {x: 50, y: 400}, to: {x: 50, y: 350}});
        expect(nearestArrow(bubble, [{top: 450, left: 0, width: 50, height: 50}])).toBeNull();
    });

    it("sort par le côté le plus proche de la direction", () => {
        expect(edgePoint({top: 0, left: 0, width: 100, height: 20}, {x: 300, y: 10})).toEqual({x: 100, y: 10});
    });
});

describe("souvenir de la visite", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("est retenu par jeu", () => {
        const store = new Map<string, string>();
        vi.stubGlobal("localStorage", {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => store.set(k, v),
        });
        expect(tourSeen("PLINKO")).toBe(false);
        markTourSeen("PLINKO");
        expect(store.has(tourKey("PLINKO"))).toBe(true);
        expect(tourSeen("PLINKO")).toBe(true);
        expect(tourSeen("KENO")).toBe(false);
    });

    it("ne propose rien si le stockage est indisponible", () => {
        vi.stubGlobal("localStorage", {
            getItem: () => {
                throw new Error("bloqué");
            },
            setItem: () => {
                throw new Error("bloqué");
            },
        });
        expect(tourSeen("PLINKO")).toBe(true);
        expect(() => markTourSeen("PLINKO")).not.toThrow();
    });
});
