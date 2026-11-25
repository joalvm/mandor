import { compileSchema, validateValue } from '@mandor/validate';
import type { QuickJSContext, QuickJSHandle } from 'quickjs-emscripten-core';

/** The name the guest finds the check of a JSON Schema under, before the script runs; the guest then hides it. */
export const HOST_SCHEMA = 'mandorSchemaCheck';

/**
 * Checks a JSON value against a JSON Schema, both as text, and answers as text: each issue as
 * `data/path message`, the words Postman's `jsonSchema` prints, or why the schema cannot be read.
 * The checker must have loaded: the run loads it when the script names `jsonSchema`.
 */
export function schemaCheckOf(schemaText: string, dataText: string): string {
    const compiled = compileSchema(schemaText);

    if (compiled.ok) {
        const issues = validateValue(compiled.schema, JSON.parse(dataText));

        return JSON.stringify({
            issues: issues.map(({ path, message }) => `data${path} ${message}`),
        });
    }

    const unreadable =
        'waiting' in compiled ? 'the schema checker has not loaded' : compiled.message;

    return JSON.stringify({ unreadable });
}

/** Gives the guest `mandorSchemaCheck(schema, data)`: two texts in, one text out. */
export function addSchemaCheck(context: QuickJSContext): void {
    const check = context.newFunction(HOST_SCHEMA, (schema, data?: QuickJSHandle) => {
        if (
            data === undefined ||
            context.typeof(schema) !== 'string' ||
            context.typeof(data) !== 'string'
        ) {
            return { error: context.newError('A schema check reads two texts') };
        }

        return context.newString(schemaCheckOf(context.getString(schema), context.getString(data)));
    });

    context.setProp(context.global, HOST_SCHEMA, check);
    check.dispose();
}
