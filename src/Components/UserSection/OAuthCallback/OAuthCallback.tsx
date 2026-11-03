import {type FormEvent, useEffect, useRef, useState} from "react";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import "../Login/Login.scss";
import {useAuth} from "../../../Context/authContext.ts";
import {oauthService, type Provider, PROVIDER_NAMES} from "../../../Services/oauth.service.ts";
import type {LoggedUser} from "../../../Models/loggedUser.model.ts";

/**
 * Page /auth/callback/:provider : Google ou Discord y renvoie le joueur après la connexion.
 * - compte connu : session ouverte, retour à la page demandée
 * - première connexion : le joueur choisit son pseudo
 * - liaison depuis le profil : retour au profil
 */

type Step =
    | { kind: "loading" }
    | { kind: "username"; signupToken: string; from?: string | undefined }
    | { kind: "error"; message: string; back: "/login" | "/profile" };

function isProvider(v: string | undefined): v is Provider {
    return v === "google" || v === "discord";
}

export default function OAuthCallback() {
    const {provider} = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const {login} = useAuth();
    const [step, setStep] = useState<Step>({kind: "loading"});
    const [username, setUsername] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    // En développement, React lance les effets deux fois : le code ne doit être utilisé qu'une fois
    const started = useRef(false);

    const name = isProvider(provider) ? PROVIDER_NAMES[provider] : "ce service";

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        const code = params.get("code");
        const state = params.get("state");
        const pending = oauthService.takePending(provider ?? "", state);
        const back = pending?.mode === "link" ? "/profile" : "/login";

        // Étape suivante à afficher, ou null si on quitte la page
        const run = async (): Promise<Step | null> => {
            if (!isProvider(provider) || !pending) {
                return {kind: "error", message: "Cette connexion n'a pas été lancée depuis JokR ou a expiré. Recommence.", back};
            }
            if (params.get("error") || !code || !state) {
                return {kind: "error", message: `Connexion avec ${name} annulée.`, back};
            }
            const result = await oauthService.callback(provider, code, state);
            if (result.result === "logged_in") {
                const {token, userId, userLevel, userXp} = result;
                login({token, userId, userLevel, userXp});
                navigate(pending.from ?? "/", {replace: true});
                return null;
            }
            if (result.result === "linked") {
                navigate("/profile", {replace: true, state: {notice: `Compte ${name} lié !`}});
                return null;
            }
            setUsername(result.suggestedUsername);
            return {kind: "username", signupToken: result.signupToken, from: pending.from};
        };

        run()
            .then(next => next && setStep(next))
            .catch((err: Error) => setStep({kind: "error", message: err.message, back}));
    }, [provider, params, login, navigate, name]);

    const submitUsername = async (e: FormEvent) => {
        e.preventDefault();
        if (step.kind !== "username") return;
        setFormError(null);
        if (!/^[\p{L}\p{N}_.-]{3,30}$/u.test(username)) {
            return setFormError("3 à 30 caractères : lettres, chiffres, _ . -");
        }
        setSaving(true);
        try {
            const user: LoggedUser = await oauthService.complete(step.signupToken, username);
            login(user);
            navigate(step.from ?? "/", {replace: true});
        } catch (err) {
            setFormError((err as Error).message);
            setSaving(false);
        }
    };

    return (
        <main className="auth">
            <div className="auth-card">
                {step.kind === "loading" && (
                    <>
                        <header className="auth-header"><h1>Connexion</h1></header>
                        <p className="auth-loading">Connexion avec {name}…</p>
                    </>
                )}

                {step.kind === "error" && (
                    <>
                        <header className="auth-header"><h1>Oups</h1></header>
                        <div className="auth-error" role="alert">{step.message}</div>
                        <Link to={step.back} className="auth-submit auth-link-button">
                            {step.back === "/profile" ? "Retour au profil" : "Retour à la connexion"}
                        </Link>
                    </>
                )}

                {step.kind === "username" && (
                    <>
                        <header className="auth-header">
                            <h1>Bienvenue !</h1>
                            <p>Dernière étape : choisis ton pseudo. C'est lui qui apparaîtra dans les classements.</p>
                        </header>
                        <form className="auth-form" onSubmit={submitUsername}>
                            <label>
                                <span>Pseudo</span>
                                <input
                                    autoFocus
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    maxLength={30}
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                />
                            </label>
                            <p className="auth-hint">3 à 30 caractères : lettres, chiffres, _ . -</p>
                            {formError && <div className="auth-error" role="alert">{formError}</div>}
                            <button type="submit" className="auth-submit" disabled={saving}>
                                {saving ? "Création…" : "C'est parti"}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </main>
    );
}
