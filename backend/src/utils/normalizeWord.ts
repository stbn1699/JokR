// Forme de comparaison d'un mot : majuscules, sans accents (« Œuf » → « OEUF », « été » → « ETE »)
export const normalizeWord = (word: string) => word
    .replace(/[œŒ]/g, "OE").replace(/[æÆ]/g, "AE")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase();
