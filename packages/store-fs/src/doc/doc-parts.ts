import { docTitle } from '@mandor/schema';
import { isMap, parseDocument } from 'yaml';

/** The block a doc may open with: `---`, optional lines, `---`. */
const FRONT = /^---\r?\n(?:[\s\S]*?\r?\n)?---(?:\r?\n|$)/u;

/** The delimiters of a front matter block, cut off to leave the yaml inside. */
const OPENING = /^---\r?\n/u;
const CLOSING = /(?:^|\r?\n)---(?:\r?\n|$)$/u;

export type DocParts = { front: string; title: string; body: string };

/** The yaml between the delimiters of a front matter block. */
export function frontYaml(front: string): string {
    return front.replace(OPENING, '').replace(CLOSING, '');
}

/**
 * Splits the text of a doc into the front matter that carries its title and the body the editor
 * shows. A block that is not valid yaml, or that is not a map, is part of the body: the person
 * wrote it, and hiding it from the editor would lose it on the next save.
 */
export function docParts(text: string): DocParts {
    const front = FRONT.exec(text)?.[0];

    if (front === undefined) {
        return { front: '', title: '', body: text };
    }

    const yaml = parseDocument(frontYaml(front));
    const readable = yaml.errors.length === 0 && (yaml.contents === null || isMap(yaml.contents));

    if (!readable) {
        return { front: '', title: '', body: text };
    }

    const title: unknown = yaml.get('title');

    return {
        front,
        title: typeof title === 'string' ? title : '',
        body: text.slice(front.length),
    };
}

/** The title a doc is known by: the one in its front matter, or the name of its file. */
export function titleOfDoc(text: string, name: string): string {
    const title = docParts(text).title;

    return title === '' ? docTitle(name) : title;
}
