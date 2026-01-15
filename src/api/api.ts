export async function api<T>(
    path: string,
    options: RequestInit = {},
    signal?: AbortSignal
): Promise<T> {
    const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.headers ?? {}),
        },
        signal,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} - ${text || res.statusText}`);
    }

    if (res.status === 204) return undefined as T;

    return (await res.json()) as T;
}