import {useEffect, useMemo, useState} from "react";
import {io, Socket} from "socket.io-client";

type AnyObj = Record<string, unknown>;

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export default function App() {
    const [ping, setPing] = useState<AnyObj | null>(null);
    const [hello, setHello] = useState<AnyObj | null>(null);
    const [pong, setPong] = useState<AnyObj | null>(null);
    const [err, setErr] = useState<string | null>(null);

    // HTTP: /ping
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_URL}/ping`);
                const json = await res.json();
                setPing(json);
            } catch (e) {
                setErr(`HTTP error: ${(e as Error).message}`);
            }
        })();
    }, []);

    // WS: hello / pong
    const socket: Socket = useMemo(
        () =>
            io(API_URL, {
                autoConnect: false,
                transports: ["websocket"], // évite les fallback polling
            }),
        []
    );

    useEffect(() => {
        socket.connect();

        const onHello = (data: AnyObj) => setHello(data);
        const onPong = (data: AnyObj) => setPong(data);

        socket.on("hello", onHello);
        socket.on("pong", onPong);

        // envoie un ping de test
        socket.emit("ping", {from: "web"});

        return () => {
            socket.off("hello", onHello);
            socket.off("pong", onPong);
            socket.disconnect();
        };
    }, [socket]);

    return (
        <pre style={{margin: 0, padding: 16, fontFamily: "monospace", fontSize: 14}}>
{`API_URL: ${API_URL}

GET /ping:
${JSON.stringify(ping, null, 2)}

WS "hello":
${JSON.stringify(hello, null, 2)}

WS "pong":
${JSON.stringify(pong, null, 2)}

${err ? `Errors:\n${err}\n` : ""}`}
    </pre>
    );
}
