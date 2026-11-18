import { getNodeValue, parseTree, type ParseError } from 'jsonc-parser';

import { nodeAt } from './range-of-pointer.js';

/** What a JSON Pointer names in a text: the line it starts on, and the value it holds. */
export type PointerPlace = {
    /** The value as compact JSON, cut short: it is read on one line, never edited. */
    excerpt: string;
    /** The line the value starts on, counted from 1 as an editor counts it. */
    line: number;
};

/** Longer than any line a list shows: what is past it is never seen. */
const EXCERPT_LIMIT = 200;

/**
 * Reads a JSONC text once and answers, for each JSON Pointer asked, where it lands and what it
 * holds there. A text the parser cannot read has no places, and a pointer that leaves the text
 * lands nowhere.
 */
export function placesIn(text: string): (pointer: string) => PointerPlace | undefined {
    const errors: ParseError[] = [];
    const root = parseTree(text, errors, { allowTrailingComma: true });

    if (root === undefined || errors.length > 0) {
        return () => undefined;
    }

    return (pointer) => {
        const node = nodeAt(root, pointer);

        if (node === undefined) {
            return undefined;
        }

        return {
            excerpt: JSON.stringify(getNodeValue(node)).slice(0, EXCERPT_LIMIT),
            line: text.slice(0, node.offset).split('\n').length,
        };
    };
}
