import {
    scriptErrorSchema,
    slugSchema,
    type ScriptNotice,
    type SkippedScript,
} from '@mandor/schema';
import { z } from 'zod';

import { SCRIPT_SAID_SHAPE } from '../script/script-said.js';

/** What one note may weigh on its way to the window, in UTF-8 bytes of its JSON. */
export const SCRIPT_NOTE_BYTES = 256 * 1024;

/** The line a note that did not fit ends with, so nothing is cut in silence. */
const CUT_LINE: ScriptNotice = { level: 'warn', notice: 'note-cut' };

/**
 * What the scripts of a connection said: `onBeforeConnect` as the socket opens, `onConnect` and
 * `onMessage` gathered per second while it lives. Every text in it is already redacted in main.
 */
export const wsScriptNoteSchema = z
    .object({
        connectionId: slugSchema,
        event: z.enum(['onBeforeConnect', 'onConnect', 'onMessage']),
        /** Epoch milliseconds, for the timeline. */
        at: z.number(),
        ...SCRIPT_SAID_SHAPE,
        /** Frames that ran no script, and `socket.send` that did not leave. */
        dropped: z.number().int().nonnegative(),
        /**
         * The socket opened with no secret at all: a script moved where it goes, or shaped a
         * Socket.IO that may ride polling, which follows a redirect with every header.
         */
        secretsOff: z.enum(['destination', 'polling']).optional(),
        error: scriptErrorSchema.optional(),
    })
    .strict();

export type WsScriptNote = z.infer<typeof wsScriptNoteSchema>;

const ENCODER = new TextEncoder();

function weightOf(note: WsScriptNote): number {
    return ENCODER.encode(JSON.stringify(note)).length;
}

function withCut(note: WsScriptNote): WsScriptNote {
    return { ...note, logs: [...note.logs, CUT_LINE] };
}

function withoutSource(script: SkippedScript): SkippedScript {
    const { name, level, event, bytes } = script;

    return { name, level, event, bytes };
}

/** The note without what makes it heavy: sources, cases and lines, least needed first. */
function lighter(note: WsScriptNote): WsScriptNote | undefined {
    if (note.skipped.some((one) => one.source !== undefined)) {
        return { ...note, skipped: note.skipped.map(withoutSource) };
    }

    if (note.logs.length > 0) {
        return { ...note, logs: note.logs.slice(0, Math.floor(note.logs.length / 2)) };
    }

    if (note.tests.length > 0) {
        return { ...note, tests: note.tests.slice(0, Math.floor(note.tests.length / 2)) };
    }

    return undefined;
}

/**
 * The note within `SCRIPT_NOTE_BYTES`: the sources of the skipped scripts go first, then the
 * last half of the lines and of the cases, until it fits; a note cut so ends with a line that
 * says so. One that fits is the same one.
 */
export function fitScriptNote(note: WsScriptNote, bytes = SCRIPT_NOTE_BYTES): WsScriptNote {
    if (weightOf(note) <= bytes) {
        return note;
    }

    let fitted = withCut(note);

    // The line that says so weighs too: it is in every measure of a cut note.
    for (let next = lighter(note); next !== undefined && weightOf(fitted) > bytes;) {
        fitted = withCut(next);
        next = lighter(next);
    }

    return fitted;
}
