/**
 * The shortest value redaction will replace. Eight characters is where a secret stops being
 * a string that also occurs in ordinary text: hiding `123` would blank every port, every
 * offset and every date in the line, and a log nobody can read is not a log that protects
 * anything.
 */
export const SHORTEST_SECRET = 8;

/** Whether hiding this value would take the text around it down with it. */
export function tooShortToHide(value: string): boolean {
    return value.length < SHORTEST_SECRET;
}
