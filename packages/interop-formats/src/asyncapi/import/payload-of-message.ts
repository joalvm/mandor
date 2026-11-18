import type { InteropDocument, InteropMessage } from '@mandor/interop-core';

import { exampleOfSchema } from './example-of-schema.js';

/**
 * The body the item opens with: the sample the document shipped, and when it shipped none, one
 * generated from the schema the message promises — an empty payload made every item open blank
 * with its structure sitting beside it in the schema pane.
 */
export function payloadOf(message: InteropMessage | undefined, document: InteropDocument): string {
    const example = message?.examples[0];

    if (example !== undefined) {
        return example;
    }

    const text = schemaOf(message, document);

    if (text === undefined) {
        return '';
    }

    try {
        return JSON.stringify(exampleOfSchema(JSON.parse(text)));
    } catch {
        return '';
    }
}

/** The text of the schema the message promises, as the document wrote it. */
export function schemaOf(
    message: InteropMessage | undefined,
    document: InteropDocument,
): string | undefined {
    const name = message?.payloadSchema;

    if (name === undefined) {
        return undefined;
    }

    return document.payloadSchemas[name]?.text;
}
