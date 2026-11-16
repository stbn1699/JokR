// Pages de jeu (partie libre, défi du jour, défi d'un jour passé, défi d'un·e ami·e, niveau) : sur téléphone, tout doit
// tenir dans l'écran (la carte des niveaux, /niveaux/<jeu>, n'en est pas une)
export const isGameRoute = (pathname: string) => /^\/(?:(?:playgame|defi|defi-ami)\/[^/]+|niveaux\/[^/]+\/\d+)/.test(pathname);
