import {useState} from "react";
import type { FormEvent } from "react";
import Header from "../../Header/Header.tsx";
import "./Register.scss";
import { clientHash } from "../../../Services/hash";
import { authService } from "../../../Services/auth.service";

export default function Register() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            // redirect to login
            window.location.href = "/login";
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
            <Header/>
            <main className="login">
                <form onSubmit={handleSubmit} className="form">
                    <h1>Inscription</h1>

                    <input
                        id="username"
                        name="username"
                        placeholder="Nom d'utilisateur"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirmation du mot de passe"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />


                    <div className="buttons">
                        <button type="button" className="secondary" onClick={() => window.location.href = "/login"} disabled={loading}>Se Connecter
                        </button>
                        <button type="submit" disabled={loading}>S'inscrire</button>
                    </div>
                    {error && <div className="error">{error}</div>}
                </form>
            </main>
        </>
    );
}