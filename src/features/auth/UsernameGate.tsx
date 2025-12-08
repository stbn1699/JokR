import type {FormEvent} from "react";
import {useState} from "react";

interface UsernameGateProps {
    onUsernameSet: (username: string) => void;
}

export function UsernameGate({onUsernameSet}: UsernameGateProps) {
    const [value, setValue] = useState("");

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        onUsernameSet(trimmed);
    };

    return (
        <div className="username-screen">
            <h1 className="app-title">Bienvenue sur JokR</h1>
            <p className="app-subtitle">
                Choisis un pseudo pour commencer à jouer.
            </p>

            <form onSubmit={handleSubmit} className="username-form">
                <input
                    type="text"
                    className="username-input"
                    placeholder="Ton pseudo…"
                    value={value}
                    onChange={(e) => setValue((e.target as HTMLInputElement).value)}
                />
                <button type="submit" className="primary-button">
                    Entrer
                </button>
            </form>
        </div>
    );
}