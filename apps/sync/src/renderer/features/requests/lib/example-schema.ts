import type { RequestExample } from '@mandor/schema';
import { compileSchema, schemaFromValue } from '@mandor/validate';

/**
 * The schema an expected body promises, with every key it has asked for: the keys that came are
 * what the API returned, and whoever reads the result edits it. A body that is not JSON has none.
 */
export function generatedSchema(body: string): string | null {
    try {
        return schemaFromValue(JSON.parse(body) as unknown, { required: true });
    } catch {
        return null;
    }
}

/**
 * The example with the text of its schema set, or without one when the text says nothing: empty
 * is not a schema, and the key goes from the file.
 */
export function withSchemaText(example: RequestExample, text: string): RequestExample {
    if (text.trim() !== '') {
        return { ...example, schema: text };
    }

    const next = { ...example };

    delete next.schema;

    return next;
}

/** Why the text of a schema cannot be read, or nothing when it can, or when there is none. */
export function schemaErrorOf(text: string | undefined): string | undefined {
    if (text === undefined || text.trim() === '') {
        return undefined;
    }

    const compiled = compileSchema(text);

    if (compiled.ok || 'waiting' in compiled) {
        return undefined;
    }

    return compiled.message;
}
