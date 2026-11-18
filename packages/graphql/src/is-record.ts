/** Whether a value read off the wire is an object with keys: a list is an object to `typeof` too. */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
