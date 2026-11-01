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
    const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
        ...options,
        headers: {
            Accept: "application/json",
            ...auth,
            ...(options.headers ?? {}),
        },
        signal,
    });

    // 401 sur une requête qui portait un token (hors login) = session expirée
    if (res.status === 401 && auth.Authorization && !path.startsWith("/users/login")) {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} - ${text || res.statusText}`);
    }

    if (res.status === 204) return undefined as T;

    const json = await res.json();

    if (isStatusEnvelope<T>(json)) {
        if (json.status !== "ok") {
            throw new Error(json.message || "API error");
        }
        return json.data;
    }

    return json as T;
}
