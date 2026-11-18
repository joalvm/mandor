import type { ActivityRecord } from '@mandor/ipc';
import { scriptNotice } from '@mandor/schema';
import { SCRIPT_LIMITS } from '@mandor/script';

import type { IncomingFrame } from './connection-scripts.js';
import { blankNote, mergeNotes, type EventNote } from './event-note.js';

/** One frame that arrived, as it waits for its `onMessage`. */
export type QueuedMessage = IncomingFrame & {
    /** What the frame weighs in the queue, in UTF-8 bytes. */
    bytes: number;
    /** A text the script does not see: it was over `payloadBytes`. */
    tooLarge: boolean;
};

type QueueLimits = Record<
    'messageQueue' | 'messageQueueBytes' | 'workerIdleMs' | 'payloadBytes',
    number
>;

export type MessageQueueDeps = {
    /** The `onMessage` of a connection on one frame. Never rejects: a failure is in the note. */
    run: (
        connectionId: string,
        message: QueuedMessage,
        signal: AbortSignal,
    ) => Promise<EventNote | undefined>;
    /** One note per second and connection, and the last one when it closes. */
    say: (note: EventNote) => void;
    limits?: Partial<QueueLimits> | undefined;
    /** How long what the runs said gathers before it goes out. */
    noteMs?: number;
};

export type MessageScriptQueue = {
    /** Never waits: a frame over the room of the queue is dropped and counted. */
    push(connectionId: string, record: Pick<ActivityRecord, 'data' | 'binary' | 'event'>): void;
    /** Empties the queue of a connection, says what it gathered and lets it go. */
    close(connectionId: string): void;
    closeAll(): void;
};

type Lane = {
    waiting: QueuedMessage[];
    bytes: number;
    /** Frames dropped since the last run, said by the next one. */
    dropped: number;
    /** The count the run in flight is to say: a close that cuts it says it instead. */
    telling: number;
    running: boolean;
    controller: AbortController;
    gathered: EventNote | undefined;
    flush: NodeJS.Timeout | undefined;
    idle: NodeJS.Timeout | undefined;
};

/** The frame as an `onMessage` reads it: bytes and a text over `payloadBytes` come without text. */
export function queuedMessageOf(
    record: Pick<ActivityRecord, 'data' | 'binary' | 'event'>,
    payloadBytes: number = SCRIPT_LIMITS.payloadBytes,
): QueuedMessage {
    const bytes = Buffer.byteLength(record.data);
    const binary = record.binary === true;
    const tooLarge = !binary && bytes > payloadBytes;
    const text = binary || tooLarge ? undefined : record.data;

    return { text, binary, event: record.event, bytes, tooLarge };
}

/** What the queue itself has to say beside a run: frames it dropped, a text the script missed. */
function queueNote(connectionId: string, dropped: number, message?: QueuedMessage): EventNote {
    const note = blankNote(connectionId, 'onMessage');

    if (dropped > 0) {
        note.dropped = dropped;
        note.logs.push(scriptNotice('queue-full', { count: dropped }));
    }

    if (message?.tooLarge === true) {
        note.logs.push(scriptNotice('message-too-large'));
    }

    return note;
}

/**
 * The `onMessage` of each connection, one frame after another, never across connections. A frame
 * waits in a queue bounded in count and in bytes; one over either is dropped and counted, and the
 * next run says how many. The socket never waits for a script. Each frame runs on a worker of the
 * pool of the app, which parks it after and closes it after `workerIdleMs`; the queue of a quiet
 * connection lets go after the same time. What the runs say gathers into one note per second.
 */
export function newMessageScriptQueue(deps: MessageQueueDeps): MessageScriptQueue {
    const limits: QueueLimits = { ...SCRIPT_LIMITS, ...deps.limits };
    const noteMs = deps.noteMs ?? 1_000;
    const lanes = new Map<string, Lane>();

    function flush(lane: Lane): void {
        clearTimeout(lane.flush);
        lane.flush = undefined;

        if (lane.gathered !== undefined) {
            deps.say(lane.gathered);
            lane.gathered = undefined;
        }
    }

    function gather(lane: Lane, note: EventNote): void {
        lane.gathered = mergeNotes(lane.gathered, note);
        lane.flush ??= setTimeout(() => {
            flush(lane);
        }, noteMs);
        lane.flush.unref();
    }

    function end(connectionId: string, lane: Lane): void {
        lane.controller.abort();
        clearTimeout(lane.idle);

        const dropped = lane.dropped + lane.telling;

        if (dropped > 0) {
            gather(lane, queueNote(connectionId, dropped));
        }

        lane.waiting = [];
        flush(lane);
        lanes.delete(connectionId);
    }

    function rest(connectionId: string, lane: Lane): void {
        lane.idle = setTimeout(() => {
            end(connectionId, lane);
        }, limits.workerIdleMs);
        lane.idle.unref();
    }

    async function runNext(
        connectionId: string,
        lane: Lane,
        message: QueuedMessage,
    ): Promise<void> {
        const dropped = lane.dropped;

        lane.dropped = 0;
        lane.telling = dropped;

        const note = await deps.run(connectionId, message, lane.controller.signal);

        lane.telling = 0;

        // A run the close cut says nothing: what the lane gathered, and its count, went with it.
        if (lane.controller.signal.aborted) {
            return;
        }

        if (dropped > 0 || message.tooLarge) {
            gather(lane, queueNote(connectionId, dropped, message));
        }

        if (note !== undefined) {
            gather(lane, note);
        }
    }

    async function pump(connectionId: string, lane: Lane): Promise<void> {
        lane.running = true;
        clearTimeout(lane.idle);

        try {
            for (let next = lane.waiting.shift(); next !== undefined; next = lane.waiting.shift()) {
                lane.bytes -= next.bytes;
                await runNext(connectionId, lane, next);
            }
        } finally {
            lane.running = false;

            if (lanes.get(connectionId) === lane) {
                rest(connectionId, lane);
            }
        }
    }

    function laneOf(connectionId: string): Lane {
        const known = lanes.get(connectionId);

        if (known !== undefined) {
            return known;
        }

        const lane: Lane = {
            waiting: [],
            bytes: 0,
            dropped: 0,
            telling: 0,
            running: false,
            controller: new AbortController(),
            gathered: undefined,
            flush: undefined,
            idle: undefined,
        };

        lanes.set(connectionId, lane);

        return lane;
    }

    return {
        push(connectionId, record) {
            const lane = laneOf(connectionId);
            const message = queuedMessageOf(record, limits.payloadBytes);
            const full =
                lane.waiting.length >= limits.messageQueue ||
                lane.bytes + message.bytes > limits.messageQueueBytes;

            if (full) {
                lane.dropped += 1;

                return;
            }

            lane.waiting.push(message);
            lane.bytes += message.bytes;

            if (!lane.running) {
                void pump(connectionId, lane);
            }
        },
        close(connectionId) {
            const lane = lanes.get(connectionId);

            if (lane !== undefined) {
                end(connectionId, lane);
            }
        },
        closeAll() {
            for (const [connectionId, lane] of [...lanes]) {
                end(connectionId, lane);
            }
        },
    };
}
