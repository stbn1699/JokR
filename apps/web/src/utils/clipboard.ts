export const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error(error);
        }
    }

    if (typeof document === "undefined") {
        return false;
    }

    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.top = "-1000px";
        textArea.style.left = "-1000px";
        document.body.appendChild(textArea);

        const selection = document.getSelection();
        const originalRange = selection?.rangeCount ? selection.getRangeAt(0) : null;

        textArea.select();
        const successful = document.execCommand("copy");

        document.body.removeChild(textArea);

        if (originalRange) {
            selection?.removeAllRanges();
            selection?.addRange(originalRange);
        }

        return successful;
    } catch (error) {
        console.error(error);
        return false;
    }
};
