import {describe, expect, it, vi} from "vitest";
import jwt from "jsonwebtoken";

vi.mock("../config.js", () => ({
    config: {
        jwtSecret: "secret-de-test-assez-long-pour-les-jwt-1234",
        appUrl: "https://jokr.test",
        oauth: {google: {clientId: "g-id", clientSecret: "g-secret"}, discord: undefined},
    },
}));

const {
    authorizeUrl, createSignupToken, createState, enabledProviders, parseDiscordProfile, parseGoogleProfile,
    readSignupToken, readState, usernameFromDisplayName,
} = await import("./oauth.js");

describe("state", () => {
    it("revient intact pour le même fournisseur", () => {
        expect(readState(createState("google", "login"), "google")).toEqual({mode: "login"});
        expect(readState(createState("google", "link", "u1"), "google")).toEqual({mode: "link", linkUserId: "u1"});
    });

    it("est refusé pour un autre fournisseur, falsifié ou expiré", () => {
        expect(readState(createState("google", "login"), "discord")).toBeNull();
        expect(readState(createState("google", "login") + "x", "google")).toBeNull();
        const expired = jwt.sign({purpose: "oauth-state", provider: "google", mode: "login", nonce: "n"},
            "secret-de-test-assez-long-pour-les-jwt-1234", {expiresIn: -10});
        expect(readState(expired, "google")).toBeNull();
    });

    it("n'accepte pas un jeton de session ou d'inscription", () => {
        const session = jwt.sign({sub: "u1"}, "secret-de-test-assez-long-pour-les-jwt-1234");
        expect(readState(session, "google")).toBeNull();
        const signup = createSignupToken({provider: "google", providerUserId: "1", email: null, displayName: null});
        expect(readState(signup, "google")).toBeNull();
    });
});

describe("jeton d'inscription", () => {
    it("garde le profil", () => {
        const profile = {provider: "discord" as const, providerUserId: "42", email: "a@b.fr", displayName: "Ana"};
        expect(readSignupToken(createSignupToken(profile))).toEqual(profile);
    });

    it("refuse un state", () => {
        expect(readSignupToken(createState("google", "login"))).toBeNull();
    });
});

describe("fournisseurs", () => {
    it("ne garde que ceux configurés", () => {
        expect(enabledProviders()).toEqual(["google"]);
    });

    it("construit l'adresse de connexion Google", () => {
        const url = new URL(authorizeUrl("google", "abc"));
        expect(url.origin).toBe("https://accounts.google.com");
        expect(url.searchParams.get("client_id")).toBe("g-id");
        expect(url.searchParams.get("redirect_uri")).toBe("https://jokr.test/auth/callback/google");
        expect(url.searchParams.get("state")).toBe("abc");
        expect(url.searchParams.get("client_secret")).toBeNull();
    });
});

describe("profils", () => {
    it("Google : l'email n'est gardé que s'il est vérifié", () => {
        expect(parseGoogleProfile({sub: "1", email: "A@Gmail.com", email_verified: true, name: "Ana B"}))
            .toEqual({provider: "google", providerUserId: "1", email: "a@gmail.com", displayName: "Ana B"});
        expect(parseGoogleProfile({sub: "1", email: "a@gmail.com", email_verified: false}).email).toBeNull();
    });

    it("Discord : nom affiché en priorité, email seulement si vérifié", () => {
        expect(parseDiscordProfile({id: "9", username: "ana_b", global_name: "Ana", email: "a@b.fr", verified: true}))
            .toEqual({provider: "discord", providerUserId: "9", email: "a@b.fr", displayName: "Ana"});
        expect(parseDiscordProfile({id: "9", username: "ana_b", global_name: null, email: "a@b.fr", verified: false}))
            .toEqual({provider: "discord", providerUserId: "9", email: null, displayName: "ana_b"});
    });

    it("refuse un profil sans identifiant", () => {
        expect(() => parseGoogleProfile({email: "a@b.fr"})).toThrow();
        expect(() => parseDiscordProfile(null)).toThrow();
    });
});

describe("usernameFromDisplayName", () => {
    it("ne garde que les caractères autorisés", () => {
        expect(usernameFromDisplayName("Jean Dupont")).toBe("Jean_Dupont");
        expect(usernameFromDisplayName("Élodie 🎮!")).toBe("Élodie_");
        expect(usernameFromDisplayName("a".repeat(50))).toHaveLength(30);
    });

    it("complète un nom trop court ou vide", () => {
        expect(usernameFromDisplayName("A")).toBe("joueurA");
        expect(usernameFromDisplayName(null)).toBe("joueur");
    });
});
