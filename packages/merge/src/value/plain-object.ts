/** A record: not a list, not `null`, not a scalar. The only objects JSON and YAML produce. */
export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The value under a key the object owns. `record['constructor']` would answer with the function
 * of the prototype, and a merge that reads it would invent a value no file ever had.
 */
export function ownValue(record: Record<string, unknown>, key: string): unknown {
    return Object.hasOwn(record, key) ? record[key] : undefined;
}
