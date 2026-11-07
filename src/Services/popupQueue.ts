import {useSyncExternalStore} from "react";

/*
 * Popups qui s'ouvrent toutes seules (nouveautés, XP des défis) : une seule à la fois.
 * La popup des nouveautés est prioritaire ; les autres attendent qu'elle soit fermée.
 */
let whatsNewOpen = false;
const listeners = new Set<() => void>();

export const popupQueue = {
    setWhatsNewOpen(open: boolean) {
        if (whatsNewOpen === open) return;
        whatsNewOpen = open;
        listeners.forEach(l => l());
    },
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

// Vrai tant que la popup des nouveautés est affichée
export const useWhatsNewOpen = () => useSyncExternalStore(subscribe, () => whatsNewOpen);
