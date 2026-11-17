import type { Nodes } from 'hast';

/** What the filter puts in front of every id a doc writes, so no id of a doc names the window's. */
export const DOC_ID_PREFIX = 'user-content-';

/** The plain text of a node and of everything inside it, the way its reader would copy it. */
export function textOf(node: Nodes | undefined): string {
    if (node === undefined) {
        return '';
    }

    if (node.type === 'text') {
        return node.value;
    }

    return 'children' in node ? node.children.map(textOf).join('') : '';
}

/** The language the fence of a block of code names, without the `language-` its class carries. */
export function languageOf(code: Nodes | undefined): string | undefined {
    if (code?.type !== 'element') {
        return undefined;
    }

    const classes = code.properties.className;

    if (!Array.isArray(classes)) {
        return undefined;
    }

    const named = classes.map(String).find((name) => name.startsWith('language-'));

    return named?.slice('language-'.length);
}

/** The anchor of a heading, the way GitHub writes it: lower case, no punctuation, dashes. */
export function anchorOf(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .replace(/\s/g, '-');
}
