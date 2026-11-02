// Pages de jeu (partie libre, défi du jour, défi d'un jour passé) : sur téléphone, tout doit tenir dans l'écran
export const isGameRoute = (pathname: string) => /^\/(playgame|defi)\/[^/]+/.test(pathname);
