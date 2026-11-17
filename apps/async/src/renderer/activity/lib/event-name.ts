import type { ActivityRecord } from '@mandor/ipc';

import { isParsablePayload } from './parsable-payload.js';

/**
 * The event a frame names, read off the payload itself: a peer that answers a `DeviceLogin`
 * writes the name back inside the JSON it returns. Answers nothing for a frame that carries no
 * event, that is not a json object, or that is too large to be worth parsing for a row title —
 * a payload that does not parse is a payload the row shows raw, and nothing more is invented.
 */
export function eventNameOf(data: string): string | null {
    if (!isParsablePayload(data)) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(data);

        if (typeof parsed !== 'object' || parsed === null || !('event' in parsed)) {
            return null;
        }

        const { event } = parsed;

        return typeof event === 'string' && event !== '' ? event : null;
    } catch {
        return null;
    }
}

/**
 * The name of the frame a row stands for: the event that signed it when this window sent it, or
 * the `event` the peer wrote inside the payload. A frame that names nothing shows only its
 * preview — the row does not invent a name for it.
 */
export function recordNameOf(record: ActivityRecord): string | null {
    if (record.origin !== undefined) {
        return record.origin;
    }

    // Bytes name nothing: what looks like an event inside them is the reader's wishful parsing.
    if (record.binary === true) {
        return null;
    }

    return eventNameOf(record.data);
}
