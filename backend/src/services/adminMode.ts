import type {Kysely} from "kysely";
import type {DB} from "../db/schema.js";

/*
 * Mode admin (« mode fantôme ») : un administrateur le met et l'enlève depuis le header.
 * Tant qu'il est actif, le joueur ne laisse aucune trace :
 * - puzzles : traité comme un invité (pas d'XP, de crédits, de résultats, de classements, ni de statistiques)
 * - casino : mises invisibles des autres, crédits illimités (rien n'est retiré ni gagné), rien dans les statistiques
 * - boutique : toutes les cosmétiques débloquées pour les essayer (remises à zéro en sortant du mode)
 * La liste des joueurs en mode admin est gardée en mémoire (lue au démarrage) : aucune requête en plus par appel.
 */
const ghosts = new Set<string>();

export const isGhost = (userId: string | null | undefined): boolean => userId != null && ghosts.has(userId);

export async function loadAdminModes(db: Kysely<DB>): Promise<void> {
    const rows = await db.selectFrom("users").select("id").where("admin_mode", "=", true).execute();
    ghosts.clear();
    for (const r of rows) ghosts.add(r.id);
}

export function setGhost(userId: string, on: boolean): void {
    if (on) ghosts.add(userId);
    else ghosts.delete(userId);
}
