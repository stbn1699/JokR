import {type PointerEvent, useEffect, useRef} from "react";
import {weekdayShort} from "./calendar.ts";
import "./DayStrip.scss";

type DayStripProps = {
    // Tous les jours du mois (AAAA-MM-JJ)
    days: string[];
    // Jours qui ont un défi (les autres sont grisés)
    available: Set<string>;
    // Jours où le joueur a réussi au moins un défi (petit point vert)
    completed: Set<string>;
    // Jours où le joueur a réussi tous les défis (point doré)
    allDone: Set<string>;
    today: string;
    selected: string | null;
    onSelect: (date: string) => void;
};

// Au-delà de ce déplacement (px), un appui est un glissement et pas un clic
const DRAG_THRESHOLD = 6;

/**
 * Bandeau des jours du mois : on le fait glisser (doigt, souris ou molette) puis on clique un jour.
 * Le jour choisi est recentré. Les jours sans défi sont grisés et ne se cliquent pas.
 */
export default function DayStrip({days, available, completed, allDone, today, selected, onSelect}: DayStripProps) {
    const stripRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null);

    // Recentre le jour choisi : d'un coup à l'arrivée et au changement de mois, en douceur sinon
    const centeredMonth = useRef<string | null>(null);
    useEffect(() => {
        const strip = stripRef.current;
        const day = strip?.querySelector<HTMLElement>(".day-strip-day.selected");
        if (!strip || !day) return;
        const left = day.offsetLeft - (strip.clientWidth - day.clientWidth) / 2;
        const month = days[0]?.slice(0, 7) ?? null;
        if (centeredMonth.current !== month) {
            centeredMonth.current = month;
            strip.scrollLeft = left;
            return;
        }
        strip.scrollTo({left, behavior: "smooth"});
        // Certains navigateurs ignorent le défilement en douceur : on vérifie et on termine d'un coup
        const check = window.setTimeout(() => {
            if (Math.abs(strip.scrollLeft - left) > 2 && left <= strip.scrollWidth - strip.clientWidth) strip.scrollLeft = left;
        }, 600);
        return () => window.clearTimeout(check);
    }, [selected, days]);

    // Molette verticale = défilement horizontal du bandeau
    useEffect(() => {
        const strip = stripRef.current;
        if (!strip) return;
        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            e.preventDefault();
            strip.scrollLeft += e.deltaY;
        };
        strip.addEventListener("wheel", onWheel, {passive: false});
        return () => strip.removeEventListener("wheel", onWheel);
    }, []);

    // Glisser à la souris (au doigt, le navigateur fait défiler tout seul)
    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "mouse" || !stripRef.current) return;
        drag.current = {x: e.clientX, scroll: stripRef.current.scrollLeft, moved: false};
    };
    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const current = drag.current;
        if (!current || !stripRef.current) return;
        const dx = e.clientX - current.x;
        if (Math.abs(dx) > DRAG_THRESHOLD && !current.moved) {
            current.moved = true;
            stripRef.current.classList.add("dragging");
        }
        if (current.moved) stripRef.current.scrollLeft = current.scroll - dx;
    };
    const endDrag = () => {
        stripRef.current?.classList.remove("dragging");
        // Laisse le clic qui suit un glissement être ignoré, puis oublie le glissement
        window.setTimeout(() => (drag.current = null), 0);
    };

    return (
        <div className="day-strip" ref={stripRef}
             onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}
             role="listbox" aria-label="Jour">
            {days.map(date => {
                const enabled = available.has(date);
                const classes = [
                    "day-strip-day",
                    date === selected ? "selected" : "",
                    date === today ? "today" : "",
                    enabled ? "" : "disabled",
                ];
                return (
                    <button
                        key={date}
                        type="button"
                        role="option"
                        aria-selected={date === selected}
                        className={classes.join(" ")}
                        disabled={!enabled}
                        title={enabled ? undefined : "Pas de défi ce jour-là"}
                        onClick={() => {
                            if (drag.current?.moved) return;
                            onSelect(date);
                        }}
                    >
                        <span className="day-strip-weekday">{weekdayShort(date).replace(".", "")}</span>
                        <span className="day-strip-number">{Number(date.slice(8))}</span>
                        <span className={`day-strip-dot ${completed.has(date) ? "visible" : ""} ${allDone.has(date) ? "gold" : ""}`}
                              aria-hidden/>
                        {completed.has(date) && <span className="sr-only">{allDone.has(date) ? "(tout réussi)" : "(réussi)"}</span>}
                    </button>
                );
            })}
        </div>
    );
}
