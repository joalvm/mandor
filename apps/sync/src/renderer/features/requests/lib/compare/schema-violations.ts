import { compileSchema, validateValue, type SchemaIssue } from '@mandor/validate';

/** What the schema judges: the JSON a body holds, or the body as a string when it holds none. */
function valueOf(text: string): unknown {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

/**
 * The rules of the schema of its status that the answer breaks, each with where the value is
 * and where the rule is. An answer that is not JSON is judged as the string it is: the HTML of a
 * gateway breaks a schema that asks for an object. No schema, or no body at all, breaks nothing.
 * A schema that cannot be read answers why, and the answer is checked against nothing.
 */
export function schemaViolations(
    schemaText: string | undefined,
    receivedBody: string,
): SchemaIssue[] | { error: string } {
    if (schemaText === undefined || schemaText.trim() === '') {
        return [];
    }

    const compiled = compileSchema(schemaText);

    if ('waiting' in compiled) {
        return [];
    }

    if (!compiled.ok) {
        return { error: compiled.message };
    }

    return receivedBody.trim() === '' ? [] : validateValue(compiled.schema, valueOf(receivedBody));
}
