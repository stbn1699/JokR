// Pages de jeu (partie libre, défi du jour, défi d'un jour passé, défi d'un·e ami·e) : sur téléphone, tout doit tenir dans l'écran
export const isGameRoute = (pathname: string) => /^\/(playgame|defi|defi-ami)\/[^/]+/.test(pathname);
