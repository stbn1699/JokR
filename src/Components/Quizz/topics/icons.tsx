import type {IconBaseProps} from "react-icons";

/**
 * Icônes dessinées pour les thèmes du Quizz, quand react-icons n'a rien qui convienne. Même forme qu'une icône
 * react-icons (1em, couleur du texte) : elles s'utilisent partout comme les autres (voir QuizzIcon).
 */

// Cars : le « 95 » de Flash McQueen, en italique très gras
export function Cars95Icon({size = "1em", color, title, style, ...props}: IconBaseProps) {
    return (
        <svg viewBox="0 0 120 80" width={size} height={size} fill="currentColor" stroke="none"
             style={{...style, ...color ? {color} : {}}} {...props}>
            {title && <title>{title}</title>}
            <text x="64" y="64" textAnchor="middle" fontSize="62" fontWeight="900" fontStyle="italic"
                  fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif" letterSpacing="-3">95</text>
        </svg>
    );
}
