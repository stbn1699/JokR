import {describe, expect, it} from "vitest";
import {isPushEndpoint, isPushNight, parsePushSubscription, pushMessage} from "./push.js";

describe("isPushNight", () => {
    it("garde la nuit de 22 h à 9 h, heure de Paris, en hiver", () => {
        expect(isPushNight(new Date("2026-01-15T20:59:00Z"))).toBe(false); // 21 h 59
        expect(isPushNight(new Date("2026-01-15T21:00:00Z"))).toBe(true); // 22 h
        expect(isPushNight(new Date("2026-01-15T23:30:00Z"))).toBe(true); // 0 h 30
        expect(isPushNight(new Date("2026-01-15T07:59:00Z"))).toBe(true); // 8 h 59
        expect(isPushNight(new Date("2026-01-15T08:00:00Z"))).toBe(false); // 9 h
    });

    it("suit l'heure d'été", () => {
        expect(isPushNight(new Date("2026-07-15T06:59:00Z"))).toBe(true); // 8 h 59
        expect(isPushNight(new Date("2026-07-15T07:00:00Z"))).toBe(false); // 9 h
        expect(isPushNight(new Date("2026-07-15T20:00:00Z"))).toBe(true); // 22 h
    });
});

describe("isPushEndpoint", () => {
    it("accepte les services de push connus", () => {
        expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
        expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
        expect(isPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
        expect(isPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe(true);
    });

    it("refuse toute autre adresse", () => {
        for (const url of [
            "http://fcm.googleapis.com/fcm/send/abc",
            "https://localhost/abc",
            "https://192.168.1.10/abc",
            "https://fcm.googleapis.com.evil.test/abc",
            "https://evilnotify.windows.com/abc",
            "https://fcm.googleapis.com:8443/abc",
            "https://user:pass@fcm.googleapis.com/abc",
            "pas une adresse",
            42,
        ]) expect(isPushEndpoint(url)).toBe(false);
    });
});

describe("parsePushSubscription", () => {
    const valid = {endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: {p256dh: "BNc_d-1", auth: "tBH-q2"}};

    it("garde l'adresse et les clés", () => {
        expect(parsePushSubscription(valid)).toEqual({endpoint: valid.endpoint, p256dh: "BNc_d-1", auth: "tBH-q2"});
    });

    it("refuse un abonnement incomplet ou mal formé", () => {
        expect(parsePushSubscription(null)).toBeNull();
        expect(parsePushSubscription({endpoint: valid.endpoint})).toBeNull();
        expect(parsePushSubscription({...valid, keys: {p256dh: "a b", auth: "c"}})).toBeNull();
        expect(parsePushSubscription({...valid, keys: {p256dh: "a".repeat(129), auth: "c"}})).toBeNull();
    });
});

describe("pushMessage", () => {
    it("annonce une demande d'ami·e et ouvre son profil", () => {
        expect(pushMessage({id: "1", kind: "friend_request", data: {username: "Léa B"}})).toEqual({
            title: "Demande d'ami·e", body: "Léa B veut être ton ami·e", url: "/joueur/L%C3%A9a%20B", tag: "friend_request:1",
        });
    });

    it("ouvre la grille d'un défi d'ami·e", () => {
        const m = pushMessage({id: "2", kind: "friend_challenge", data: {challengeId: "abc", from: {username: "Sam"}, gameName: "Sudoku"}});
        expect(m?.title).toBe("Sam te défie");
        expect(m?.url).toBe("/defi-ami/abc");
    });

    it("dit qui gagne un défi relevé", () => {
        const result = (playerMs: number) => pushMessage({id: "3", kind: "challenge_result",
            data: {by: {username: "Sam"}, gameName: "Binero", playerMs, senderMs: 1000}})?.body;
        expect(result(900)).toBe("Binero : Sam te bat");
        expect(result(1100)).toBe("Binero : tu restes devant");
        expect(result(1000)).toBe("Binero : égalité");
    });

    it("duel : annonce le duel, puis le temps à battre tant que tu n'as pas joué", () => {
        const sent = pushMessage({id: "5", kind: "friend_challenge",
            data: {challengeId: "d", from: {username: "Sam"}, gameName: "Queens", difficulty: "Expert", senderMs: null}});
        expect(sent?.body).toBe("Un duel de Queens (Expert) t'attend. À toi !");
        const played = pushMessage({id: "6", kind: "challenge_result",
            data: {challengeId: "d", by: {username: "Sam"}, gameName: "Queens", playerMs: 65_400, senderMs: null}});
        expect(played).toMatchObject({title: "Sam a joué votre duel", body: "Queens en 1:05 : à toi de jouer !", url: "/defi-ami/d"});
    });

    it("annonce un lot de loterie", () => {
        const m = pushMessage({id: "4", kind: "lottery_win", data: {kind: "week", prize: 50, tickets: 1, totalTickets: 3}});
        expect(m?.title).toBe("Tu as gagné la loterie de la semaine !");
        expect(m?.body).toBe("+50 crédits avec 1 ticket sur 3");
        expect(m?.url).toBe("/hasard/loterie");
    });

    it("résume les défis du jour", () => {
        const m = pushMessage({id: "5", kind: "daily_results", data: {games: [{name: "Queens", rank: 1, total: 8}, {name: "Tracé", rank: 2, total: 5}]}});
        expect(m?.body).toBe("Tu termines 1er sur 8 au Queens (et 1 autre défi)");
    });

    it("n'envoie ni la bienvenue ni une sorte inconnue", () => {
        expect(pushMessage({id: "6", kind: "welcome", data: {credits: 500}})).toBeNull();
        expect(pushMessage({id: "7", kind: "autre", data: {}})).toBeNull();
    });
});
