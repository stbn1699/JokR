/**
 * Composant Login - Page de connexion utilisateur
 *
 * Gère l'authentification des utilisateurs avec :
 * - Google / Discord (boutons de AuthCard, si configurés sur le serveur)
 * - Identification par nom d'utilisateur OU email + mot de passe
 * - Hashage côté client du mot de passe (SHA-256) avant envoi au serveur
 * - Ouverture de la session via l'AuthContext (token + userId gardés dans localStorage)
 * - Redirection vers la page demandée (ou l'accueil) après connexion réussie
 *
 * Sécurité :
 * - Double hashage : SHA-256 côté client + bcrypt côté serveur
 * - Token JWT avec expiration 7 jours
 */

import type {FormEvent} from "react";
import {useState} from "react";
import "./Login.scss";
import {clientHash} from "../../../Services/hash";
import {authService} from "../../../Services/auth.service";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../../../Context/authContext.ts";
import AuthCard from "./AuthCard.tsx";
import PasswordInput from "./PasswordInput.tsx";
import {useMaintenance} from "../../../Services/maintenance.ts";

export default function Login() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();
    // Page à rouvrir après la connexion (ex : un défi du jour), sinon l'accueil
    const from = (useLocation().state as { from?: string } | null)?.from;
    const {login} = useAuth();
    // mise à jour en cours : seul un administrateur se connecte utilement, on l'amène sur l'onglet « En direct »
    const updating = useMaintenance().on;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!identifier || !password) return setError("Tous les champs sont requis");

        try {
            setLoading(true);
            // Le mot de passe ne part jamais en clair : SHA-256 ici, bcrypt sur le serveur
            const loggedUser = await authService.login(identifier.trim(), await clientHash(password));
            login(loggedUser);
            navigate(updating ? "/stats?onglet=direct" : from ?? "/");
        } catch (err: unknown) {
            setError(err instanceof Error && err.message ? err.message : "Erreur lors de la connexion");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthCard
            title="Connexion"
            subtitle="Content de te revoir !"
            from={from}
            footer={<>Pas encore de compte ? <Link to="/register" state={{from}}>Créer un compte</Link></>}
        >
            <form onSubmit={handleSubmit} className="auth-form">
                <label>
                    <span>Pseudo ou email</span>
                    <input
                        id="identifier"
                        name="identifier"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                    />
                </label>

                <label>
                    <span>Mot de passe</span>
                    <PasswordInput
                        id="password"
                        name="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </label>

                {error && <div className="auth-error" role="alert">{error}</div>}

                <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? "Connexion…" : "Se connecter"}
                </button>
            </form>
        </AuthCard>
    );
}
