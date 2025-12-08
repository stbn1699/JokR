export function formatPlayerNumbers(nums?: number[]): string {
    if (!nums || nums.length === 0) return "";

    const sorted = Array.from(new Set(nums)).sort((a, b) => a - b);

    const parts: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const n = sorted[i];
        if (n === end + 1) {
            end = n;
        } else {
            parts.push(start === end ? `${start}` : `${start}-${end}`);
            start = end = n;
        }
    }
    parts.push(start === end ? `${start}` : `${start}-${end}`);

    const joined = parts.join(" ou ");
    // gestion du singulier/pluriel : singulier uniquement si l'unique option est 1
    const totalUnique = sorted.length;
    if (totalUnique === 1 && sorted[0] === 1) {
        return `${joined} joueur`;
    }
    return `${joined} joueurs`;
}
