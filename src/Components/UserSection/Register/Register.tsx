import type {FormEvent} from "react";
import {useState} from "react";
import "../Login/Login.scss"; // même mise en forme que la connexion
import {clientHash} from "../../../Services/hash";
import {authService} from "../../../Services/auth.service";
import {useLocation, useNavigate} from "react-router-dom";

export default function Register() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    // Page à rouvrir après la connexion qui suit l'inscription
    const from = (useLocation().state as { from?: string } | null)?.from;

    const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!username || !email || !password) return setError("Tous les champs sont requis");
        if (password !== confirmPassword) return setError("Les mots de passe ne correspondent pas");
        if (!validateEmail(email)) return setError("Email invalide");
        try {
            setLoading(true);
            const firstHash = await clientHash(password);
            await authService.register(username, email, firstHash);
            // Compte créé : connexion, puis retour à la page demandée
            navigate("/login", {state: {from}});
        } catch (err: unknown) {
            // Handle unknown error without using `any` to satisfy ESLint/TS rules
            if (err instanceof Error) {
                setError(err.message || "Erreur lors de l'inscription");
            } else {
                setError(typeof err === 'string' ? err : "Erreur lors de l'inscription");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <main className="login">
                <form onSubmit={handleSubmit} className="form">
                    <h1>Inscription</h1>

                    <input
                        id="username"
                        name="username"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="Nom d'utilisateur"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Confirmer le mot de passe"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />


                    <div className="buttons">
                        <button type="button" className="secondary" onClick={() => navigate("/login", {state: {from}})}
                                disabled={loading}>Se Connecter
                        </button>
                        <button type="submit" disabled={loading}>S'inscrire</button>
                    </div>
                    {error && <div className="error">{error}</div>}
                </form>
            </main>
        </>
    );
}