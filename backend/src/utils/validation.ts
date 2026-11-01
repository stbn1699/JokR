const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Évite d'envoyer à Postgres un id mal formé (ce qui provoquerait une erreur 500)
export function isUuid(value: string): boolean {
    return UUID_REGEX.test(value);
}

// Paramètre de route en string (les types Express l'annoncent comme string | string[])
export function routeParam(params: Record<string, string | string[] | undefined>, name: string): string | undefined {
    const value = params[name];
    return typeof value === "string" ? value : undefined;
}
