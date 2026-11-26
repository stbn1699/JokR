"""
Quizz : remet à jour la liste des thèmes du site (src/Components/Quizz/topics/index.ts) et sa copie côté serveur
(QUIZZ_TOPIC_NAMES et QUIZZ_TOPIC_CATEGORIES, backend/src/utils/quizz.ts) à partir des fichiers de thèmes.
    python scripts/sync-quizz-topics.py
Ordre : par catégorie (ordre de QUIZZ_CATEGORIES), puis par nom.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOPICS = ROOT / "src/Components/Quizz/topics"
BACKEND = ROOT / "backend/src/utils/quizz.ts"
SKIP = {"index.ts", "types.ts", "icons.tsx"}

categories = re.findall(r'\{id: "([a-z-]+)", label:', (TOPICS / "types.ts").read_text(encoding="utf8"))
topics = []
for f in sorted(TOPICS.glob("*.ts")):
    if f.name in SKIP:
        continue
    s = f.read_text(encoding="utf8")
    var = re.search(r"export const (\w+): QuizzTopic", s).group(1)
    tid = re.search(r'^    id: "([a-z0-9-]+)"', s, re.M).group(1)
    name = re.search(r'^    name: "([^"]+)"', s, re.M).group(1)
    cat = re.search(r'^    category: "([a-z-]+)"', s, re.M).group(1)
    topics.append((categories.index(cat), name.lower(), f.stem, var, tid, name, cat))
topics.sort()

imports = "\n".join(f'import {{{t[3]}}} from "./{t[2]}.ts";' for t in topics)
names = "\n".join(f"    {t[3]}," for t in topics)
(TOPICS / "index.ts").write_text(f'''import type {{QuizzTopic}} from "./types.ts";
{imports}

export * from "./types.ts";

/**
 * Tous les thèmes du Quizz. Pour en ajouter un : un fichier dans ce dossier (voir starWars.ts), puis
 * `python scripts/sync-quizz-topics.py`, qui remet à jour cette liste et sa copie sur le serveur. Ses questions vont
 * en base (quizz_questions), par une migration SQL (voir V1_0_80__quizz_site_questions.sql).
 */
export const QUIZZ_TOPICS: QuizzTopic[] = [
{names}
];

export const findTopic = (id: string | undefined) => QUIZZ_TOPICS.find(t => t.id === id);
''', encoding="utf8", newline="\n")

js = lambda v: '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'
b = BACKEND.read_text(encoding="utf8")
b = re.sub(r"(export const QUIZZ_TOPIC_NAMES: Record<string, string> = \{\n).*?(\n\};)",
           lambda m: m.group(1) + "\n".join(f"    {js(t[4])}: {js(t[5])}," for t in topics) + m.group(2), b, flags=re.S)
b = re.sub(r"(export const QUIZZ_TOPIC_CATEGORIES: Record<string, string> = \{\n).*?(\n\};)",
           lambda m: m.group(1) + "\n".join(f"    {js(t[4])}: {js(t[6])}," for t in topics) + m.group(2), b, flags=re.S)
BACKEND.write_text(b, encoding="utf8", newline="\n")
print(f"{len(topics)} thèmes")
