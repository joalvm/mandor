import type { ScriptError } from '@mandor/schema';
import { z } from 'zod';

// What a script failed with is text: no object of the guest crosses to the host.

export const SCRIPT_FILE = 'script.js';

/**
 * Where the script sits inside the source the engine runs: `offset` lines come before it and it
 * has `lines` lines. A place outside it is the wrapper's, and is not told to the person.
 */
export type LineWindow = { offset: number; lines: number };

/** The window of a script that is the whole source: any line counts. */
const WHOLE: LineWindow = { offset: 0, lines: Number.POSITIVE_INFINITY };

/** What a script threw and no one could read: named apart, so the window says it in its words. */
export const UNREADABLE: ScriptError = {
    message: 'The error could not be read',
    errorName: 'ErrorUnreadable',
};

/**
 * The place in the script of the first frame of the stack that is inside it. A frame in the guest
 * that wraps the script is skipped: the next one is where the script called into it.
 */
function locationOf(stack: string, span: LineWindow): Pick<ScriptError, 'line' | 'column'> {
    const frames = new RegExp(`${SCRIPT_FILE}:(\\d+)(?::(\\d+))?`, 'gu');

    for (const found of stack.matchAll(frames)) {
        const line = Number(found[1]) - span.offset;

        if (line >= 1 && line <= span.lines) {
            return found[2] === undefined ? { line } : { line, column: Number(found[2]) };
        }
    }

    return {};
}

/** The text the guest builds for a thrown value, with every field a text. */
const thrownSchema = z.object({ name: z.string(), message: z.string(), stack: z.string() });

/** The value of a JSON text, or `undefined` when it is none. */
export function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

/**
 * Reads the text the guest built for a thrown value. The guest is not trusted to build it well: a
 * text that is no JSON, or lacks a field, becomes the error that could not be read.
 */
export function parseThrown(text: string, span: LineWindow = WHOLE): ScriptError {
    const parsed = thrownSchema.safeParse(parseJson(text));

    if (!parsed.success) {
        return UNREADABLE;
    }

    const { name, message, stack } = parsed.data;

    return { message, errorName: name, ...locationOf(stack, span) };
}
