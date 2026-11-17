import { type Document, parseDocument } from 'yaml';

/**
 * The document of a YAML text. `parseDocument` collects syntax errors instead of throwing, so
 * nothing else would notice: an edit over a text that does not parse would rewrite what it
 * could not read.
 */
export function parsedDocument(text: string): Document {
    const document = parseDocument(text);
    const failure = document.errors[0];

    if (failure !== undefined) {
        throw failure;
    }

    return document;
}
