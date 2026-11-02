// Export des données brutes de la page Statistiques

// Lignes d'objets → CSV (séparateur « ; » et BOM : s'ouvre tel quel dans Excel en français)
export function toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return "";
    const columns = Object.keys(rows[0]);
    const cell = (value: unknown) => {
        if (value === null || value === undefined) return "";
        const text = typeof value === "object" ? JSON.stringify(value) : String(value);
        return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = [columns.join(";"), ...rows.map(row => columns.map(c => cell(row[c])).join(";"))];
    return "\u{FEFF}" + lines.join("\r\n");
}

// Fait télécharger un fichier au navigateur
export function downloadFile(name: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
}
