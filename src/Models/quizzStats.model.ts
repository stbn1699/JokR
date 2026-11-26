// Statistiques du Quizz (GET /stats/quizz, administrateur), voir backend/src/repository/QuizzStats.repository.ts

export type QuizzMode = "solo" | "random" | "friend" | "live";

// Réponses données (par thème, catégorie ou question) ; avgMs : temps moyen pour répondre
export type QuizzAnswerStats = { answers: number; correct: number; avgMs: number };

export type QuizzStatsData = {
    generatedAt: string;
    overview: {
        games: number; finished: number; players: number; games1: number; players7: number; first: string | null;
        answers: number; correct: number; timeouts: number; avgMs: number | null;
    };
    modes: { mode: QuizzMode; games: number; finished: number; players: number; avgScore: number | null }[];
    timeline: { day: string; games: number; byMode: Partial<Record<QuizzMode, number>> }[];
    // ce qui a été choisi : un thème ou un mélange (tout, categorie-…, mix-…)
    picks: { topicId: string; games: number; players: number; avgScore: number | null }[];
    topics: (QuizzAnswerStats & { topicId: string; players: number })[];
    categories: (QuizzAnswerStats & { category: string; players: number })[];
    // par clé fixe : q:<id en base>
    questions: (QuizzAnswerStats & { key: string; topicId: string; question: string; timeouts: number; last: string })[];
    players: { username: string; games: number; answers: number; correct: number; bestScore: number; last: string }[];
    // toutes les questions (quizz_questions), tous statuts ; number : numéro d'une question du site, vide pour un joueur
    bank: {
        id: string; topicId: string; number: number | null; question: string; answers: [string, string, string, string];
        status: "pending" | "approved" | "rejected"; author: string | null; createdAt: string; reviewedAt: string | null;
    }[];
};
