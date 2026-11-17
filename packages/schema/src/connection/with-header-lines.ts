/** A value read from disk that is an object of named fields, not a list. */
function isFields(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function linesOf(record: unknown, enabled: boolean): Record<string, unknown>[] {
    if (!isFields(record)) {
        return [];
    }

    return Object.entries(record).map(([key, value]) => ({ key, value, enabled }));
}

/**
 * Reads a connection written before its headers were lines: `headers` was a record of the ones
 * sent and `disabledHeaders` a record of the ones switched off. Both become the lines they stood
 * for, the sent ones first. Anything else passes through untouched, for the schema to judge.
 */
export function withHeaderLines(raw: unknown): unknown {
    if (!isFields(raw) || !isFields(raw['headers'])) {
        return raw;
    }

    return {
        ...raw,
        headers: [...linesOf(raw['headers'], true), ...linesOf(raw['disabledHeaders'], false)],
    };
}
