import "./Lessons.scss";

/**
 * Ombre et projecteur d'une leçon sur un plateau SVG à une unité par case : à poser en dernier dans le SVG
 * (au-dessus des cases, sans capter les clics).
 */
export default function LessonSpots({size, lit, columns = size}: { size: number; lit: Set<number> | null; columns?: number }) {
    if (!lit) return null;
    const cells = Array.from({length: size * columns}, (_, cell) => cell);
    return (
        <g className="lesson-spots" aria-hidden>
            {cells.filter(cell => !lit.has(cell)).map(cell => (
                <rect key={cell} className="lesson-veil" x={cell % columns} y={Math.floor(cell / columns)} width={1} height={1}/>
            ))}
            {[...lit].map(cell => (
                <rect key={`lit-${cell}`} className="lesson-spot" x={cell % columns + 0.06} y={Math.floor(cell / columns) + 0.06} width={0.88} height={0.88} rx={0.12}/>
            ))}
        </g>
    );
}
