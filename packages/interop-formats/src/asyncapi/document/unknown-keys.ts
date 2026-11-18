import { stripParserNotes } from './parser-notes.js';

/**
 * The keys of a raw object that no mapping claimed. They ride along into the workspace — the
 * envelope keeps what Mandor does not understand, and dropping them here would drop work.
 * The parser's own notes never count as content.
 */
export function unknownKeys(
    raw: Record<string, unknown>,
    known: readonly string[],
): Record<string, unknown> {
    const extras: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(raw)) {
        if (!known.includes(key) && !key.startsWith('x-parser-')) {
            extras[key] = stripParserNotes(value);
        }
    }

    return extras;
}
