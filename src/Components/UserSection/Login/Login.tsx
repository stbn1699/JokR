/**
 * Composant Login - Page de connexion utilisateur
 *
 * Gère l'authentification des utilisateurs avec :
 * - Identification par nom d'utilisateur OU email
 * - Hashage côté client du mot de passe (SHA-256) avant envoi au serveur
 * - Stockage du token JWT et de l'userId dans localStorage
 * - Redirection vers l'accueil après connexion réussie
 *
 * Sécurité :
 * - Double hashage : SHA-256 côté client + bcrypt côté serveur
 * - Token JWT avec expiration 7 jours
 */

import type {FormEvent} from "react";
import {useState} from "react";
import Header from "../../Header/Header.tsx";
import "./Login.scss";
import {clientHash} from "../../../Services/hash";
import {authService} from "../../../Services/auth.service";
import type {LoggedUser} from "../../../Models/loggedUser.model.ts";

/**
 * Composant de la page de connexion
 * @returns JSX du formulaire de connexion avec gestion des états
 */
export default function Login() {
    // État : identifiant saisi (nom d'utilisateur ou email)
    const [identifier, setIdentifier] = useState("");

    // État : mot de passe saisi
    const [password, setPassword] = useState("");

    // État : indicateur de chargement pendant la requête API
    const [loading, setLoading] = useState(false);

    // État : message d'erreur à afficher (null si pas d'erreur)
    const [error, setError] = useState<string | null>(null);

    /**
     * Gère la soumission du formulaire de connexion
     *
     * Processus :
     * 1. Valide que tous les champs sont remplis
     * 2. Hash le mot de passe côté client (SHA-256)
     * 3. Envoie les credentials au serveur
     * 4. Stocke le token JWT et l'userId en localStorage
     * 5. Redirige vers la page d'accueil
     *
     * @param e - Événement de soumission du formulaire
     */
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault(); // Empêche le rechargement de la page
        setError(null); // Réinitialise les erreurs précédentes

        // Validation : vérifier que tous les champs sont remplis
        if (!identifier || !password) return setError("Tous les champs sont requis");

        try {
            setLoading(true); // Désactive les boutons pendant le chargement

            // Étape 1 : Premier hashage côté client (SHA-256)
            // Permet d'éviter l'envoi du mot de passe en clair
            const Hash = await clientHash(password);

            // Étape 2 : Envoyer la requête de connexion au backend
            // Le backend va comparer avec le hash bcrypt stocké en base
            const loggedUser: LoggedUser = await authService.login(identifier, Hash)

            // Étape 3 : Extraire les données de la réponse
            const token = loggedUser.token; // Token JWT pour authentifier les requêtes futures
            const userId = loggedUser.userId; // ID de l'utilisateur pour récupérer ses stats

            // Étape 4 : Sauvegarder les informations en localStorage
            authService.saveToken(token); // Stocke le token JWT
            localStorage.setItem('userId', userId); // Stocke l'ID utilisateur

            // Étape 5 : Rediriger vers la page d'accueil
            window.location.href = "/";
        } catch (err: unknown) {
            // Gestion des erreurs : convertir en message lisible
            if (err instanceof Error) {
                setError(err.message || "Erreur lors de la connexion");
            } else {
                setError(typeof err === 'string' ? err : "Erreur lors de la connexion");
            }
        } finally {
            // Toujours arrêter le chargement à la fin
            setLoading(false);
        }
    };

    return (
        <>
            <Header/>
            <main className="login">
                <form onSubmit={handleSubmit} className="form">
                    <h1>Connexion</h1>

                    {/* Champ identifiant : accepte nom d'utilisateur OU email */}
                    <input
                        id="identifier"
                        name="identifier"
                        placeholder="Nom d'utilisateur ou email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                    />

                    {/* Champ mot de passe (masqué) */}
                    <input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {/* Boutons d'action */}
                    <div className="buttons">
                        {/* Bouton secondaire : redirection vers l'inscription */}
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => window.location.href = "/register"}
                            disabled={loading}
                        >
                            s'inscrire
                        </button>

                        {/* Bouton principal : soumission du formulaire */}
                        <button type="submit" disabled={loading}>Se connecter</button>
                    </div>

                    {/* Affichage des erreurs si présentes */}
                    {error && <div className="error">{error}</div>}
                </form>
            </main>
        </>
    );
}