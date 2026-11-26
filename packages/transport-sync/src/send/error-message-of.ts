/** The words an error carries, trimmed; a value that is not an error or a text carries none. */
function wordsOf(value: unknown): string {
    if (value instanceof Error) {
        return value.message.trim();
    }

    return typeof value === 'string' ? value.trim() : '';
}

/** Each attempt of an error that stands for several: one per address a name resolved to. */
function attemptsOf(error: unknown): readonly unknown[] {
    return error instanceof AggregateError ? error.errors : [];
}

function codeOf(error: Error): string {
    const code: unknown = Reflect.get(error, 'code');

    return typeof code === 'string' ? code : '';
}

/** An error with no words of its own says what it wraps, its code, or at least its name. */
function fallbackOf(error: unknown): string {
    const candidates =
        error instanceof Error
            ? [wordsOf(error.cause), codeOf(error), error.name]
            : [String(error).trim()];

    return candidates.find((candidate) => candidate !== '') ?? 'unknown error';
}

/**
 * What a failed send says, in the transport's own words and never empty: it is the line the
 * window shows under the reason, the one that says what to fix. Node fails a name that resolved
 * to several addresses with an `AggregateError` that has no message, so the words are those of
 * each attempt, one per line and each once.
 */
export function errorMessageOf(error: unknown): string {
    const lines = new Set([error, ...attemptsOf(error)].map(wordsOf).filter((line) => line !== ''));

    return lines.size > 0 ? [...lines].join('\n') : fallbackOf(error);
}
