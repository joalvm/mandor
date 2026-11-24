/** The whitespace of HTTP: tab, line feed, carriage return and space, at either end. */
const HTTP_WHITESPACE_AROUND = /^[\t\n\r ]+|[\t\n\r ]+$/gu;

/**
 * A header value as it leaves: the whitespace around it dropped, as the Fetch standard
 * normalizes it, so a value pasted with its line break still goes out. A break inside the
 * value stays: the transport refuses it, and says why.
 */
export function trimHeaderValue(value: string): string {
    return value.replace(HTTP_WHITESPACE_AROUND, '');
}
