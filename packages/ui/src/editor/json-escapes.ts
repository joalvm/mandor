/**
 * Every escape of a JSON text, in order: a surrogate pair written as two escapes, one `\uXXXX`,
 * and any other escape, matched so that the `u` after an escaped backslash is never read as one.
 */
const ESCAPE =
    /\\u([dD][89abAB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})|\\u([0-9a-fA-F]{4})|\\[^u]/g;

/** What a string has to keep escaped to stay one: the quote, the backslash and what does not show. */
const KEPT = /^[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}"\\]$/u;

/** The character a `\u` escape stands for, or nothing for any other escape. */
function characterOf(high?: string, low?: string, single?: string): string | undefined {
    if (single !== undefined) {
        return String.fromCharCode(Number.parseInt(single, 16));
    }

    if (high === undefined || low === undefined) {
        return undefined;
    }

    return String.fromCharCode(Number.parseInt(high, 16), Number.parseInt(low, 16));
}

/**
 * A JSON text with its `\u` escapes written as the characters they stand for: `electr\u00f3nico`
 * reads `electrónico`, the way Postman shows a body. The other escapes stay as the server wrote
 * them (`\/`, `\n`), and so does a character a string cannot hold bare, so the text still parses
 * to the same value. Only for reading: what the person writes is never rewritten.
 */
export function withEscapesShown(text: string): string {
    if (!text.includes('\\u')) {
        return text;
    }

    return text.replace(
        ESCAPE,
        (escape: string, high?: string, low?: string, single?: string): string => {
            const character = characterOf(high, low, single);

            return character === undefined || KEPT.test(character) ? escape : character;
        },
    );
}
