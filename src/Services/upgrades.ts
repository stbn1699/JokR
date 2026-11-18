import {useSyncExternalStore} from "react";
import {shopService} from "./shop.service.ts";
import {type UpgradeGame, upgradeLevels, type UpgradeLevels, upgradeValueFor} from "../../backend/src/utils/upgrades.ts";

/*
 * Améliorations achetées par le joueur (voir backend/src/utils/upgrades.ts) : lues avec le reste de la boutique
 * (GET /shop) et partagées dans tout le site. Les jeux s'en servent pour verrouiller ce qui n'est pas débloqué
 * (le serveur le vérifie aussi) ; la boutique les met à jour après un achat.
 */

let owned: string[] = [];
let levels: UpgradeLevels = upgradeLevels([]);
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

function apply(items: string[]) {
    owned = items.filter(id => id.startsWith("upgrade-"));
    levels = upgradeLevels(owned);
    notify();
}

// Lu une fois (seulement pour un joueur connecté : sinon la requête échoue, et c'est la valeur de base partout)
function load(): Promise<void> {
    loading ??= shopService.state()
        .then(state => apply(state.owned))
        .catch(() => {
            loading = null;
        });
    return loading;
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    void load();
    return () => listeners.delete(listener);
};

// Niveaux de toutes les améliorations
export const useUpgradeLevels = () => useSyncExternalStore(subscribe, () => levels, () => levels);

// Valeur d'une amélioration pour le joueur (colonnes des machines à sous, billes par lancer…)
export const useUpgradeValue = (id: string) => upgradeValueFor(useUpgradeLevels(), id);

// Niveau acheté dans la boutique : pris en compte tout de suite dans les jeux
export function addOwnedUpgrade(itemId: string) {
    if (itemId.startsWith("upgrade-") && !owned.includes(itemId)) apply([...owned, itemId]);
}

// Objets possédés relus (boutique ouverte, changement de compte ou de mode admin)
export function setOwnedItems(items: string[]) {
    loading = Promise.resolve();
    apply(items);
}

// Rubrique de la boutique de chaque jeu (adresse /boutique/<clé>) ; les machines à sous ouvrent les améliorations
export const UPGRADE_SECTIONS: { key: string; game: UpgradeGame; name: string }[] = [
    {key: "ameliorations", game: "slots", name: "Machines à sous"},
    {key: "ameliorations-plinko", game: "plinko", name: "Plinko"},
    {key: "ameliorations-keno", game: "keno", name: "Keno"},
    {key: "ameliorations-roulette", game: "roulette", name: "Roulette"},
    {key: "ameliorations-loterie", game: "lottery", name: "Loterie"},
    {key: "ameliorations-roue", game: "wheel", name: "Roue du jour"},
    {key: "ameliorations-boutique", game: "shop", name: "Boutique"},
];
