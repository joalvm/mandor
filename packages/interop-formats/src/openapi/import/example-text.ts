/**
 * The text an example travels as: the value of a parameter, a body, a response. The only place
 * an example becomes text, because the export reads it back with the inverse and a round trip
 * holds only while the two do not drift apart.
 *
 * A text stays as it is, even in JSON: a text with a `{{var}}` in it is not JSON and must come
 * back as written. Anything else is JSON, whatever the content type: a document written in YAML
 * or JSON only holds numbers, booleans, null and structures, and for all of them JSON is the one
 * text with an inverse.
 */
export function exampleText(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    return value === undefined ? '' : JSON.stringify(value, null, 2);
}
