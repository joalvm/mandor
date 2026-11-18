type SchemaOptions = {
    /** Every key the value has is one it must have, in each object, however deep. */
    required?: boolean;
};

/**
 * The JSON Schema a value meets, written from the value itself. Conservative and dumb on
 * purpose: it names types and shapes, and by default decides nothing about `required`,
 * `format` or `pattern` — a guess about what the server demands is a false error waiting to
 * happen, and the message a person is about to send is such a guess.
 *
 * `required: true` is for the value of an answer already observed: the keys it came with are
 * what the API returned, and whoever reads the result edits it.
 */
export function schemaFromValue(value: unknown, options: SchemaOptions = {}): string {
    return JSON.stringify(schemaOf(value, options.required === true), null, 2);
}

function schemaOf(value: unknown, required: boolean): Record<string, unknown> {
    if (value === null) {
        return { type: 'null' };
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return { type: 'array' };
        }

        return { type: 'array', items: schemaOf(value[0], required) };
    }

    if (typeof value === 'object') {
        // Defined, not assigned: a key `__proto__` stays a key instead of becoming a prototype.
        const properties = Object.fromEntries(
            Object.entries(value).map(([key, each]) => [key, schemaOf(each, required)]),
        );

        if (Object.keys(properties).length === 0) {
            return { type: 'object' };
        }

        return required
            ? { type: 'object', properties, required: Object.keys(properties) }
            : { type: 'object', properties };
    }

    if (typeof value === 'number') {
        return { type: 'number' };
    }

    if (typeof value === 'boolean') {
        return { type: 'boolean' };
    }

    return { type: 'string' };
}
