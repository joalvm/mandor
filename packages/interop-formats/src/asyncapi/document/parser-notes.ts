import { isRecord } from '@mandor/interop-core';

/**
 * The parser annotates what it hands back with x-parser keys — schema ids, message names, parse
 * markers. Those notes are the parser's bookkeeping, not the document's content, and anything
 * written into a workspace carries the document alone.
 */
export function stripParserNotes(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((each) => stripParserNotes(each));
    }

    return isRecord(value) ? stripNotesOfObject(value) : value;
}

function stripNotesOfObject(raw: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};

    for (const [key, each] of Object.entries(raw)) {
        if (!key.startsWith('x-parser-')) {
            clean[key] = stripParserNotes(each);
        }
    }

    return clean;
}
