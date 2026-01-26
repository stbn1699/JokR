import type {FormEvent} from "react";
import {useState} from "react";
import Header from "../../Header/Header.tsx";
import "./Login.scss";
import {clientHash} from "../../../Services/hash";
import {authService} from "../../../Services/auth.service";
import type {LoggedUser} from "../../../Models/loggedUser.model.ts";

export default function Login() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!identifier || !password) return setError("Tous les champs sont requis");
        try {
            setLoading(true);
            const Hash = await clientHash(password);

            const loggedUser :LoggedUser = await authService.login(identifier, Hash)

            const token = loggedUser.token;
            const userId = loggedUser.userId;

            authService.saveToken(token);
            localStorage.setItem('userId', userId);
            window.location.href = "/";
        } catch
            (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || "Erreur lors de la connexion");
            } else {
                setError(typeof err === 'string' ? err : "Erreur lors de la connexion");
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
                    <h1>Connexion</h1>
                    <input
                        id="identifier"
                        name="identifier"
                        placeholder="Nom d'utilisateur ou email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                    />

                    <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <div className="buttons">
                        <button type="button" className="secondary" onClick={() => window.location.href = "/register"}
                                disabled={loading}>s'inscrire
                        </button>
                        <button type="submit" disabled={loading}>Se connecter</button>
                    </div>
                    {error && <div className="error">{error}</div>}
                </form>
            </main>
        </>
    );
}