import type { ChainResult } from '@mandor/host';
import type { WsScriptNote } from '@mandor/ipc';
import { scriptNotice, type ChainLog } from '@mandor/schema';

/** The two events of a connection that runs while the socket lives. */
export type ConnectionEvent = 'onConnect' | 'onMessage';

/**
 * What the scripts of a connection said, as the window hears it: the `onBeforeConnect` of an
 * open, one run, or the runs of one second of `onMessage`.
 */
export type EventNote = WsScriptNote;

/** The lines of one note: past them, a second of `onMessage` says it cut the rest. */
const NOTE_LINES = 200;

const CUT = scriptNotice('lines-cut', { limit: NOTE_LINES });

/** A note that says nothing yet, stamped now. */
export function blankNote(connectionId: string, event: EventNote['event']): EventNote {
    return {
        connectionId,
        event,
        at: Date.now(),
        logs: [],
        tests: [],
        skipped: [],
        dropped: 0,
        switchedOff: 0,
        variables: [],
        withheld: [],
    };
}

/** What a chain of one event said, as a note stamped now. */
export function noteOfChain(
    connectionId: string,
    event: EventNote['event'],
    output: ChainResult,
): EventNote {
    return {
        ...blankNote(connectionId, event),
        logs: output.logs,
        tests: output.tests,
        skipped: output.skipped,
        switchedOff: output.switchedOff,
        variables: output.variables,
        ...(output.error === undefined ? {} : { error: output.error }),
    };
}

function cappedLogs(head: ChainLog[], tail: ChainLog[]): ChainLog[] {
    // A note already cut carries the line that says so past the cap: it takes no more.
    if (head.length > NOTE_LINES) {
        return head;
    }

    const all = [...head, ...tail];

    return all.length > NOTE_LINES ? [...all.slice(0, NOTE_LINES), CUT] : all;
}

/** Two notes of a connection as one: the lines in order, the counts added, the last values. */
export function mergeNotes(before: EventNote | undefined, after: EventNote): EventNote {
    if (before === undefined) {
        return after;
    }

    const error = after.error ?? before.error;
    const secretsOff = after.secretsOff ?? before.secretsOff;

    return {
        ...before,
        logs: cappedLogs(before.logs, after.logs),
        tests: [...before.tests, ...after.tests].slice(0, NOTE_LINES),
        skipped: [...before.skipped, ...after.skipped].slice(0, NOTE_LINES),
        dropped: before.dropped + after.dropped,
        switchedOff: before.switchedOff + after.switchedOff,
        variables: after.variables,
        withheld: [...new Set([...before.withheld, ...after.withheld])],
        ...(secretsOff === undefined ? {} : { secretsOff }),
        ...(error === undefined ? {} : { error }),
    };
}
