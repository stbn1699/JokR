/**
 * Page « Installe JokR » : sur téléphone et tablette, dans le navigateur, le site est remplacé par cette page.
 * Le parcours dépend de l'appareil (voir Services/installApp.ts). Dans l'app installée, le site s'affiche normalement.
 */

import "./SmallScreen.scss";
import {useState, type ReactNode} from "react";
import {FaCheckCircle, FaDownload, FaEllipsisV, FaLink, FaRegPlusSquare} from "react-icons/fa";
import {IoShareOutline} from "react-icons/io5";
import {installTarget, promptInstall, useInstallPrompt} from "../../Services/installApp.ts";

function Steps({steps}: {steps: ReactNode[]}) {
    return (
        <ol className="install-steps">
            {steps.map((step, index) => <li key={index}>{step}</li>)}
        </ol>
    );
}

function IosSteps() {
    return <Steps steps={[
        <>Touche <strong>Partager</strong> <IoShareOutline className="install-inline-icon" aria-hidden/></>,
        <>Choisis <strong>Sur l'écran d'accueil</strong> <FaRegPlusSquare className="install-inline-icon" aria-hidden/></>,
        <>Touche <strong>Ajouter</strong>, puis ouvre JokR depuis ton écran d'accueil</>,
    ]}/>;
}

function BrowserSteps() {
    return <Steps steps={[
        <>Ouvre le <strong>menu</strong> de ton navigateur <FaEllipsisV className="install-inline-icon" aria-hidden/></>,
        <>Choisis <strong>Installer l'application</strong> ou <strong>Ajouter à l'écran d'accueil</strong></>,
        <>Ouvre JokR depuis ton écran d'accueil</>,
    ]}/>;
}

function InAppBrowser() {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };
    return (
        <>
            <p className="small-screen-sub">Ouvre cette page dans Chrome ou Safari pour pouvoir l'installer</p>
            <button type="button" className="install-button" onClick={() => void copy()}>
                {copied ? <FaCheckCircle aria-hidden/> : <FaLink aria-hidden/>}
                {copied ? "Lien copié" : "Copier le lien"}
            </button>
        </>
    );
}

export default function InstallApp() {
    const {canPrompt, installed} = useInstallPrompt();
    const target = installTarget(navigator.userAgent, navigator.maxTouchPoints);

    return (
        <main className="small-screen install-app">
            <img src="/icons/maskable-192.png" alt="" className="install-app-icon"/>
            {installed ? (
                <div role="status" className="install-app-text">
                    <p>JokR est installé !</p>
                    <p className="small-screen-sub">Ouvre-le depuis ton écran d'accueil pour jouer</p>
                </div>
            ) : (
                <>
                    <div className="install-app-text">
                        <h1>Installe JokR pour jouer</h1>
                        <p className="small-screen-sub">Sur téléphone et tablette, JokR se joue dans son application</p>
                    </div>
                    {target === "in-app" && <InAppBrowser/>}
                    {target === "ios" && <IosSteps/>}
                    {target === "android" && (canPrompt
                        ? <button type="button" className="install-button" onClick={() => void promptInstall()}>
                            <FaDownload aria-hidden/> Installer JokR
                        </button>
                        : <BrowserSteps/>)}
                    <p className="small-screen-hint">Déjà installée ? Ouvre JokR depuis ton écran d'accueil</p>
                </>
            )}
        </main>
    );
}
