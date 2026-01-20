 // util to compute SHA-256 hex digest using Web Crypto
export async function sha256Hex(message: string): Promise<string> {
    const enc = new TextEncoder();
    const data = enc.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// helper to perform the client-side first hash
export async function clientHash(password: string): Promise<string> {
    return sha256Hex(password);
}

