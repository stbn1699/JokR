import {type ReactNode, useEffect, useState} from "react";
import {FcGoogle} from "react-icons/fc";
import {FaDiscord} from "react-icons/fa";
import {oauthService, type Provider, PROVIDER_NAMES} from "../../../Services/oauth.service.ts";

/*
 * Carte commune à la connexion et à l'inscription :
 * titre, boutons Google / Discord (seulement ceux configurés sur le serveur), puis le formulaire email.
 */

const ICONS: Record<Provider, ReactNode> = {google: <FcGoogle/>, discord: <FaDiscord/>};

type AuthCardProps = {
    title: string;
    subtitle: string;
    // Page à rouvrir une fois connecté
    from?: string | undefined;
    children: ReactNode;
    footer: ReactNode;
};

export default function AuthCard({title, subtitle, from, children, footer}: AuthCardProps) {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [pending, setPending] = useState<Provider | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        oauthService.providers(controller.signal)
            .then(setProviders)
            // Serveur injoignable : le formulaire affichera l'erreur s'il est utilisé
            .catch(() => undefined);
        return () => controller.abort();
    }, []);

    const start = async (provider: Provider) => {
        setError(null);
        setPending(provider);
        try {
            await oauthService.start(provider, "login", from);
            // la page change : on garde le bouton en chargement
        } catch (err) {
            setError((err as Error).message);
            setPending(null);
        }
    };

    return (
        <main className="auth">
            <div className="auth-card">
                <header className="auth-header">
                    <h1>{title}</h1>
                    <p>{subtitle}</p>
                </header>

                {providers.length > 0 && (
                    <>
                        <div className="auth-providers">
                            {providers.map(p => (
                                <button key={p} type="button" className={`auth-provider ${p}`}
                                        disabled={pending !== null} onClick={() => void start(p)}>
                                    <span className="auth-provider-icon" aria-hidden="true">{ICONS[p]}</span>
                                    {pending === p ? "Redirection…" : `Continuer avec ${PROVIDER_NAMES[p]}`}
                                </button>
                            ))}
                        </div>
                        {error && <div className="auth-error" role="alert">{error}</div>}
                        <div className="auth-divider"><span>ou avec ton email</span></div>
                    </>
                )}

                {children}

                <footer className="auth-footer">{footer}</footer>
            </div>
        </main>
    );
}
