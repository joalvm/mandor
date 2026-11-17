import type { ActivityRecord, ErrorCode, WsScriptNote } from '@mandor/ipc';

import type {
    ConnectionFaultEntry,
    ConnectionMessageEntry,
    ConnectionScriptEntry,
    ConnectionStatus,
    ConnectionStatusEntry,
} from '../../../src/renderer/activity/activity-entry.js';

const AT = 1_700_000_000_000;

/** A frame of the timeline as connections hands it over: `hola` arriving, unless told otherwise. */
export function messageEntryOf(
    record: Partial<ActivityRecord> = {},
    id = 'one',
): ConnectionMessageEntry {
    const detail = { at: AT, data: 'hola', direction: 'in' as const, ...record };

    return {
        at: detail.at,
        bytes: detail.data.length,
        detail: { ...detail, environmentId: null },
        id,
        kind: 'connection-message',
    };
}

/** A failure of the connection, as one more line of its timeline. */
export function faultEntryOf(code: ErrorCode = 'ws-open-failed', at = AT): ConnectionFaultEntry {
    return {
        at,
        bytes: 0,
        detail: { at, code },
        id: `fault-${String(at)}`,
        kind: 'connection-fault',
    };
}

/** The socket coming up or going down, as one more line of its timeline. */
export function statusEntryOf(
    status: ConnectionStatus = 'connected',
    at = AT,
): ConnectionStatusEntry {
    return {
        at,
        bytes: 0,
        detail: { status },
        id: `status-${String(at)}`,
        kind: 'connection-status',
    };
}

/** What the scripts of `alpha` said as it opened: nothing, unless told otherwise. */
export function scriptNoteOf(changes: Partial<WsScriptNote> = {}): WsScriptNote {
    return {
        connectionId: 'alpha',
        event: 'onBeforeConnect',
        at: AT,
        logs: [],
        tests: [],
        skipped: [],
        dropped: 0,
        switchedOff: 0,
        variables: [],
        withheld: [],
        ...changes,
    };
}

/** A note of the scripts, as one more line of the timeline. */
export function scriptEntryOf(changes: Partial<WsScriptNote> = {}): ConnectionScriptEntry {
    const detail = scriptNoteOf(changes);

    return {
        at: detail.at,
        bytes: 0,
        detail,
        id: `script-${String(detail.at)}`,
        kind: 'connection-script',
    };
}
