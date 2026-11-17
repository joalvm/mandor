import { parseDocument } from 'yaml';

import { docParts, frontYaml } from './doc-parts.js';

export type DocPatch = { body?: string; title?: string };

/** The front matter block with its title set, every other key and comment left as it was. */
function frontWithTitle(front: string, title: string): string {
    const yaml = parseDocument(frontYaml(front));

    yaml.set('title', title);

    return `---\n${yaml.toString()}---\n`;
}

/**
 * The text of a doc with its body, its title, or both replaced and everything else kept. The
 * title lives in the front matter, so a doc with none gets one only when a title is given: a
 * body written over a doc that never had a title stays plain markdown.
 */
export function docTextWith(text: string, patch: DocPatch): string {
    const parts = docParts(text);
    const front =
        patch.title === undefined ? parts.front : frontWithTitle(parts.front, patch.title);

    return front + (patch.body ?? parts.body);
}
