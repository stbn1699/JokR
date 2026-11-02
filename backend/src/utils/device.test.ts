import {describe, expect, it} from "vitest";
import {deviceFromUserAgent} from "./device.js";

describe("deviceFromUserAgent", () => {
    it("reconnaît un téléphone", () => {
        expect(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148")).toBe("mobile");
        expect(deviceFromUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile Safari/537.36")).toBe("mobile");
    });

    it("reconnaît une tablette", () => {
        expect(deviceFromUserAgent("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)")).toBe("tablet");
        expect(deviceFromUserAgent("Mozilla/5.0 (Linux; Android 13; SM-X700) Chrome/120 Safari/537.36")).toBe("tablet");
    });

    it("reconnaît un ordinateur", () => {
        expect(deviceFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36")).toBe("desktop");
    });

    it("renvoie null sans User-Agent", () => {
        expect(deviceFromUserAgent(undefined)).toBeNull();
    });
});
