import type {FormEvent} from "react";
import {useState} from "react";
import "../Login/Login.scss"; // même mise en forme que la connexion
import {clientHash} from "../../../Services/hash";
import {authService} from "../../../Services/auth.service";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "../../../Context/authContext.ts";
import AuthCard from "../Login/AuthCard.tsx";
import PasswordInput from "../Login/PasswordInput.tsx";

/**
 * Page d'inscription : Google / Discord (AuthCard) ou pseudo + email + mot de passe.
 * Le compte créé, le joueur est connecté directement et revient à la page demandée.
 */
export default function Register() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const {login} = useAuth();
    // Page à rouvrir après l'inscription
    const from = (useLocation().state as { from?: string } | null)?.from;

    const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!username || !email || !password) return setError("Tous les champs sont requis");
        if (!validateEmail(email)) return setError("Email invalide");
        if (password.length < 8) return setError("Le mot de passe doit faire au moins 8 caractères");
        if (password !== confirmPassword) return setError("Les mots de passe ne correspondent pas");
        try {
            setLoading(true);
            const hash = await clientHash(password);
            await authService.register(username.trim(), email.trim(), hash);
            // Compte créé : on ouvre directement la session
            login(await authService.login(username.trim(), hash));
            navigate(from ?? "/");
        } catch (err: unknown) {
            setError(err instanceof Error && err.message ? err.message : "Erreur lors de l'inscription");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthCard
            title="Inscription"
            subtitle="Crée ton compte pour garder ta progression et jouer les défis du jour."
            from={from}
            footer={<>Déjà un compte ? <Link to="/login" state={{from}}>Se connecter</Link></>}
        >
            <form onSubmit={handleSubmit} className="auth-form">
                <label>
                    <span>Pseudo</span>
                    <input
                        id="username"
                        name="username"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={30}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </label>

                <label>
                    <span>Email</span>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </label>

                <label>
                    <span>Mot de passe</span>
                    <PasswordInput
                        id="password"
                        name="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </label>

                <label>
                    <span>Confirmer le mot de passe</span>
                    <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </label>

                {error && <div className="auth-error" role="alert">{error}</div>}

                <button type="submit" className="auth-submit" disabled={loading}>
                    {loading ? "Création…" : "Créer mon compte"}
                </button>
            </form>
        </AuthCard>
    );
}
