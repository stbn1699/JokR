export const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    });
