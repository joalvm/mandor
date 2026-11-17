/**
 * The value an example carries, read the other way of what an import writes: the content types
 * that speak JSON hold structures, and their text parses to the structure it came from — a
 * text stays a text, and what no JSON parses was never one, so it leaves as written. Every
 * other content type speaks plain text, and nothing to parse.
 */
export function exampleValue(text: string, contentType: string): unknown {
    const type = contentType.replace(/;.*$/u, '').trim().toLowerCase();

    if (
        type !== 'application/json' &&
        !type.endsWith('+json') &&
        type !== 'application/x-www-form-urlencoded' &&
        type !== 'multipart/form-data'
    ) {
        return text;
    }

    try {
        const parsed: unknown = JSON.parse(text);

        return typeof parsed === 'string' ? text : parsed;
    } catch {
        return text;
    }
}
