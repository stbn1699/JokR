const resolveApiUrl = (): string | undefined => {
    const configuredUrl = import.meta.env.VITE_API_URL;
    if (configuredUrl) {
        return configuredUrl;
    }

    if (import.meta.env.DEV) {
        return "http://localhost:3001";
    }

    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    return undefined;
};

export const API_URL = resolveApiUrl();
