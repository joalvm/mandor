/**
 * Whether a value read from a document someone else wrote is a record. A list is an object to
 * `typeof` too, and read as a record its indexes would pass for keys.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
