import type { AsyncClientSend } from '../client/async-client.js';
import type { SendConnectionRequest } from './connection-requests.js';
import { recordOf, type ActivityRecord } from '../activity/activity-record.js';

import type { LiveConnection } from './live-connection.js';

/**
 * Arms the wait of one emission that asked for an answer: it names the emission, and opens the
 * wait that closes by itself when the time runs out — the timeline sees that close as one more
 * frame, linked to the emission it belonged to, so no entry stays hanging for ever.
 */
export function armAck(
    connection: LiveConnection,
    request: SendConnectionRequest,
): { record: ActivityRecord; send: AsyncClientSend } {
    const out: ActivityRecord = {
        ...recordOf('out', request.data, request.origin, request.event),
        ...(request.schemaUnmet === true ? { schemaUnmet: true } : {}),
    };

    if (request.expectAck === undefined) {
        return { record: out, send: { event: request.event } };
    }

    const id = `ack-${connection.request.connectionId}-${String((connection.ackSeq += 1))}`;
    const at = Date.now();
    const timer = setTimeout(() => {
        connection.acks.delete(id);
        connection.batcher.record({
            ...recordOf('in', '', undefined, request.event),
            elapsedMs: Date.now() - at,
            replyTo: id,
            timedOut: true,
        });
    }, request.expectAck.timeoutMs);

    connection.acks.set(id, { at, event: request.event, timer });

    return {
        record: { ...out, id },
        send: { event: request.event, ack: { id, timeoutMs: request.expectAck.timeoutMs } },
    };
}

/** The record of an answer: linked to the emission it closes, with the time it took. */
export function recordReply(
    connection: LiveConnection,
    message: {
        data: string | Uint8Array;
        event?: string | undefined;
        replyTo?: string | undefined;
    },
): ActivityRecord {
    const elapsedMs = settleAck(connection, message.replyTo ?? '');

    return {
        ...recordOf('in', message.data, undefined, message.event),
        replyTo: message.replyTo,
        ...(elapsedMs === undefined ? {} : { elapsedMs }),
    };
}

/** Closes the wait an answer came for, and answers how long it took. */
export function settleAck(connection: LiveConnection, replyTo: string): number | undefined {
    const waiting = connection.acks.get(replyTo);

    if (waiting === undefined) {
        return undefined;
    }

    clearTimeout(waiting.timer);
    connection.acks.delete(replyTo);

    return Date.now() - waiting.at;
}

/** Forgets every wait of a connection that is going away or being replaced. */
export function cancelAcks(connection: LiveConnection): void {
    for (const waiting of connection.acks.values()) {
        clearTimeout(waiting.timer);
    }

    connection.acks.clear();
}
