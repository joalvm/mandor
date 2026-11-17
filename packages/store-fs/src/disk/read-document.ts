import type { Document } from 'yaml';

import type { LoadWarning } from './load-warning.js';
import { nameOfYaml } from './name-of-yaml.js';
import { parsedDocument } from './parsed-document.js';
import { readFileText } from './read-file-text.js';

/**
 * The document is kept alongside the validated value: a later write edits that tree, so
 * comments, key order and keys this app does not understand survive the round trip.
 */
export type DocumentRead<T> =
    { ok: true; document: Document; value: T } | { ok: false; warning: LoadWarning };

/** The text of a file that was read: parsed and validated, or a warning with the name it carries. */
function parsedRead<T>(
    path: string,
    source: string,
    parse: (input: unknown) => T,
): DocumentRead<T> {
    try {
        const document = parsedDocument(source);
        const contents: unknown = document.toJS();

        return { ok: true, document, value: parse(contents) };
    } catch (error) {
        const name = nameOfYaml(source);

        return {
            ok: false,
            warning: { path, message: String(error), ...(name === '' ? {} : { name }) },
        };
    }
}

/** Reads one YAML file. A file that cannot be read or parsed yields a warning, never a throw. */
export async function readDocument<T>(
    path: string,
    parse: (input: unknown) => T,
): Promise<DocumentRead<T>> {
    try {
        return parsedRead(path, await readFileText(path), parse);
    } catch (error) {
        return { ok: false, warning: { path, message: String(error) } };
    }
}
