import type {FormEvent} from "react";
import {useEffect, useState} from "react";

interface UsernameGateProps {
    onUsernameSet: (username: string) => void;
}

const STORAGE_KEY = "jokr.username";

export function UsernameGate({onUsernameSet}: UsernameGateProps) {
    const [username, setUsername] = useState("");

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored.trim()) {
            setUsername(stored);
            onUsernameSet(stored);
        }
    }, [onUsernameSet]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = username.trim();
        if (!trimmed) return;
        localStorage.setItem(STORAGE_KEY, trimmed);
        onUsernameSet(trimmed);
    };

    return (
        <div className="username-screen">
            <h1 className="app-title">Bienvenue sur JokR</h1>
            <p className="app-subtitle">Choisis un pseudo pour commencer à jouer.</p>

            <form onSubmit={handleSubmit} className="username-form">
                <input
                    type="text"
                    className="username-input"
                    placeholder="Ton pseudo…"
                    value={username}
                    onChange={(e) => setUsername((e.target as HTMLInputElement).value)}
                />
                <button type="submit" className="primary-button">
                    Entrer
                </button>
            </form>
        </div>
    );
}