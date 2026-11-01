export interface ApiResponse<T> {
    status: "ok" | "error" | string;
    data: T;
    message?: string;
}

function isStatusEnvelope<T>(v: unknown): v is ApiResponse<T> {
    return (
        v !== null &&
        typeof v === "object" &&
        "status" in v &&
        typeof v.status === "string" &&
        "data" in v
    );
}

/**
 * Erreur renvoyée par l'API : `message` est un texte lisible (en français) à afficher tel quel,
 * `status` le code HTTP (0 si le serveur n'a pas pu être joint).
 */
export class ApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

// Message de secours quand le serveur ne donne pas d'explication
function fallbackMessage(status: number): string {
    if (status === 0) return "Impossible de joindre le serveur. Vérifie ta connexion et réessaie.";
    if (status === 401) return "Connexion requise.";
    if (status === 404) return "Ressource introuvable.";
    if (status === 429) return "Trop de tentatives, réessaie dans quelques minutes.";
    if (status >= 500) return "Le serveur a rencontré un problème, réessaie plus tard.";
    return "Une erreur est survenue.";
}

// Lit le message d'erreur dans la réponse JSON du serveur ({ status, message })
async function errorMessage(res: Response): Promise<string> {
    try {
        const body: unknown = await res.json();
        if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
            return body.message;
        }
    } catch {
        // réponse vide ou pas du JSON
    }
    return fallbackMessage(res.status);
}

// Événement émis quand le serveur refuse le token (expiré / invalide) ; écouté par AuthProvider
export const AUTH_EXPIRED_EVENT = "auth:expired";

// Le token JWT est stocké au login (voir auth.service.ts)
function authHeader(): Record<string, string> {
    const token = localStorage.getItem("auth_token");
    return token ? {Authorization: `Bearer ${token}`} : {};
}

export async function api<T>(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal
): Promise<T> {
    const auth = authHeader();
    let res: Response;
    try {
        res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
            ...options,
            headers: {
                Accept: "application/json",
                ...auth,
                ...(options.headers ?? {}),
            },
            signal,
        });
    } catch (err) {
        // Requête annulée volontairement : on laisse passer l'AbortError
        if (err instanceof DOMException && err.name === "AbortError") throw err;
        throw new ApiError(fallbackMessage(0), 0);
    }

    // 401 sur une requête qui portait un token (hors login) = session expirée
    if (res.status === 401 && auth.Authorization && !path.startsWith("/users/login")) {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }

    if (!res.ok) {
        throw new ApiError(await errorMessage(res), res.status);
    }

    if (res.status === 204) return undefined as T;

    const json = await res.json();

    if (isStatusEnvelope<T>(json)) {
        if (json.status !== "ok") {
            throw new ApiError(json.message || fallbackMessage(res.status), res.status);
        }
        return json.data;
    }

    return json as T;
}
