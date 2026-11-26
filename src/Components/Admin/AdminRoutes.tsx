import {Navigate, Route, Routes, useSearchParams} from "react-router-dom";
import AdminLayout from "./AdminLayout.tsx";
import AdminOverview from "./AdminOverview.tsx";
import {PuzzleActivity, PuzzleDaily, PuzzleGames, PuzzlePlayers} from "../Stats/PuzzleStats.tsx";
import {CasinoBlackjack, CasinoKeno, CasinoOverview, CasinoPlayers, CasinoPlinko, CasinoPoker, CasinoRoulette, CasinoSlots} from "../Stats/CasinoStats.tsx";
import {QuizzActivity, QuizzBank} from "../Stats/QuizzStats.tsx";
import ShopStats from "../Stats/ShopStats.tsx";
import StatsLive from "../Stats/StatsLive.tsx";
import FeedbackAdmin from "../Feedback/FeedbackAdmin.tsx";
import {QuizzQuestionsAdmin, QuizzReportsAdmin, QuizzThemesAdmin} from "../Quizz/QuizzAdmin.tsx";

// Pages de la console d'administration (/admin/…), dans l'ordre de la barre latérale (voir adminNav.ts)
export default function AdminRoutes() {
    return (
        <Routes>
            <Route element={<AdminLayout/>}>
                <Route index element={<AdminOverview/>}/>
                <Route path="puzzles" element={<Navigate to="activite" replace/>}/>
                <Route path="puzzles/activite" element={<PuzzleActivity/>}/>
                <Route path="puzzles/jeux" element={<PuzzleGames/>}/>
                <Route path="puzzles/defis" element={<PuzzleDaily/>}/>
                <Route path="puzzles/joueurs" element={<PuzzlePlayers/>}/>
                <Route path="hasard" element={<Navigate to="apercu" replace/>}/>
                <Route path="hasard/apercu" element={<CasinoOverview/>}/>
                <Route path="hasard/plinko" element={<CasinoPlinko/>}/>
                <Route path="hasard/roulette" element={<CasinoRoulette/>}/>
                <Route path="hasard/machines" element={<CasinoSlots/>}/>
                <Route path="hasard/blackjack" element={<CasinoBlackjack/>}/>
                <Route path="hasard/keno" element={<CasinoKeno/>}/>
                <Route path="hasard/poker" element={<CasinoPoker/>}/>
                <Route path="hasard/joueurs" element={<CasinoPlayers/>}/>
                <Route path="boutique" element={<ShopStats/>}/>
                <Route path="retours" element={<FeedbackAdmin/>}/>
                <Route path="quizz" element={<Navigate to="activite" replace/>}/>
                <Route path="quizz/activite" element={<QuizzActivity/>}/>
                <Route path="quizz/banque" element={<QuizzBank/>}/>
                <Route path="quizz/themes" element={<QuizzThemesAdmin/>}/>
                <Route path="quizz/questions" element={<QuizzQuestionsAdmin/>}/>
                <Route path="quizz/contestations" element={<QuizzReportsAdmin/>}/>
                <Route path="direct" element={<StatsLive/>}/>
                <Route path="*" element={<Navigate to="/admin" replace/>}/>
            </Route>
        </Routes>
    );
}

// Ancienne page /stats?onglet=… : vers la page équivalente de la console
const LEGACY_TABS: Record<string, string> = {hasard: "hasard/apercu", boutique: "boutique", direct: "direct"};

export function LegacyStatsRedirect() {
    const [current] = useSearchParams();
    const params = new URLSearchParams(current);
    const tab = params.get("onglet");
    params.delete("onglet");
    const search = params.toString();
    return <Navigate to={`/admin/${tab ? LEGACY_TABS[tab] ?? "puzzles/activite" : "puzzles/activite"}${search ? `?${search}` : ""}`} replace/>;
}
