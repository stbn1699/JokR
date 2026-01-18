import React from "react";

/**
 * Nettoie la valeur de l'input: garde uniquement un chiffre 1-9,
 * tronque à 1 caractère et empêche le 0.
 */
export function sanitizeInput(e: React.FormEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    // garder uniquement les chiffres
    el.value = el.value.replace(/[^0-9]/g, "");
    // limiter à 1 caractère
    if (el.value.length > 1) {
        el.value = el.value.slice(0, 1);
    }
    // empêcher la valeur 0
    if (el.value === "0") {
        el.value = "";
    }
}
