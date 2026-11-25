import { type Document, isScalar, type ToStringOptions } from 'yaml';

/** No wrapping, two spaces. A wrapped value turns one edited field into a multi-line diff. */
const STRINGIFY: ToStringOptions = { lineWidth: 0, indent: 2 };

/**
 * The text a document has once `changes` are in it. Changes go into the loaded tree instead of
 * re-serializing the plain object, which is what keeps comments, key order and the keys this
 * app does not understand but the other one wrote.
 *
 * A change worth `undefined` takes the key out. That is the only way a merge can say «this
 * field is gone»: leaving it out of the changes means «do not touch it», which is what protects
 * the keys of the other app.
 */
export function documentTextWith(document: Document, changes: Record<string, unknown>): string {
    for (const [key, value] of Object.entries(changes)) {
        if (value === undefined) {
            document.delete(key);
        }

        if (value !== undefined) {
            forgetForcedQuotes(document, key);
            document.set(key, value);
        }
    }

    return document.toString(STRINGIFY);
}

/**
 * A set over a scalar keeps its node, and the node keeps its style. An empty text can only be
 * written in quotes, so those quotes say nothing about the value that replaces it: without this,
 * a field born empty would stay quoted for good. Quotes a person chose for a real value stay.
 */
function forgetForcedQuotes(document: Document, key: string): void {
    const node = document.get(key, true);

    if (isScalar(node) && node.value === '') {
        delete node.type;
    }
}
