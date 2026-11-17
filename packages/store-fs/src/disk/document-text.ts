import type { Document, ToStringOptions } from 'yaml';

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
            document.set(key, value);
        }
    }

    return document.toString(STRINGIFY);
}
