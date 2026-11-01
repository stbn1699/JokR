const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Évite d'envoyer à Postgres un id mal formé (ce qui provoquerait une erreur 500)
export function isUuid(value: string): boolean {
    return UUID_REGEX.test(value);
}
