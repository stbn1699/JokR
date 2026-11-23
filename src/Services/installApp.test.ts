import {describe, expect, it} from "vitest";
import {installTarget, screenAccess} from "./installApp.ts";

describe("screenAccess", () => {
    it("laisse le site sur un grand écran", () => {
        expect(screenAccess(false, false, false)).toBe("site");
    });

    it("demande d'installer sur un écran tactile dans le navigateur", () => {
        expect(screenAccess(true, true, false)).toBe("install");
    });

    it("ouvre le site dans l'app installée", () => {
        expect(screenAccess(true, true, true)).toBe("site");
    });

    it("ne propose pas l'app à une fenêtre d'ordinateur trop étroite", () => {
        expect(screenAccess(true, false, false)).toBe("small");
    });
});

describe("installTarget", () => {
    const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36";
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
    const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15";

    it("reconnaît Android et iPhone", () => {
        expect(installTarget(android, 5)).toBe("android");
        expect(installTarget(iphone, 5)).toBe("ios");
    });

    it("reconnaît un iPad, qui se présente comme un Mac", () => {
        expect(installTarget(mac, 5)).toBe("ios");
    });

    it("reconnaît les navigateurs intégrés aux applis", () => {
        expect(installTarget(`${iphone} Instagram 350.0`, 5)).toBe("in-app");
        expect(installTarget(`${android} Discord/250.0`, 5)).toBe("in-app");
        expect(installTarget("Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36", 5)).toBe("in-app");
    });
});
