import { createWriteStream, type WriteStream } from 'node:fs';

import { redactMessage } from '@mandor/host';
import type { ActivityRecord, RecordStatePush, WsActivityPush } from '@mandor/ipc';

import { RecordingActiveError } from './recording-active-error.js';

export type ActivityRecorder = {
    /**
     * Opens the file the user picked. Refuses a connection already being written with
     * `RecordingActiveError`; a file the system would not open rejects with the system's error.
     */
    start: (connectionId: string, path: string) => Promise<void>;
    /** Closes the stream and answers where the file stayed, or nothing when it never ran. */
    stop: (connectionId: string) => Promise<{ entries: number; path: string } | undefined>;
    /** Whether one connection is being written right now, and how much its file holds. */
    status: (connectionId: string) => { active: boolean; entries: number };
    /** Writes one batch of activity as it leaves for the window, one redacted line per record. */
    write: (push: Pick<WsActivityPush, 'connectionId' | 'records'>) => void;
    /** Closes every recording the way the app leaving does: whole files, nothing corrupt. */
    disposeAll: () => Promise<void>;
};

export type ActivityRecorderDeps = {
    /** Where the state of the recordings goes: the bar of the connection reads it from there. */
    onState: (push: RecordStatePush) => void;
    /** How many bytes may wait for the disk before lines are dropped; 64 MiB unless a test says. */
    queueLimit?: number | undefined;
};

/** The lines dropped since the last one that reached the queue, and the moments they span. */
type Gap = { dropped: number; from: number; to: number };

/**
 * What one running recording holds: its stream, the path it writes, how much it wrote, and the
 * lines it is dropping while the disk falls behind.
 */
type Running = {
    entries: number;
    gap: Gap | null;
    path: string;
    stream: WriteStream;
};

const QUEUE_LIMIT = 64 * 1024 * 1024;

/** Says in the file how many lines never reached it, so nobody takes it for the whole session. */
function closeGap(session: Running): void {
    if (session.gap !== null) {
        session.stream.write(`${JSON.stringify(session.gap)}\n`);
        session.gap = null;
    }
}

/**
 * Writes one record, or drops it while the lines waiting for the disk pass the limit: a disk
 * slower than the socket would otherwise hold the whole session in the memory of main.
 */
function record(session: Running, line: ActivityRecord, limit: number): void {
    if (session.stream.writableLength >= limit) {
        const from = session.gap?.from ?? line.at;

        session.gap = { dropped: (session.gap?.dropped ?? 0) + 1, from, to: line.at };

        return;
    }

    closeGap(session);
    session.stream.write(`${JSON.stringify(redactMessage(line))}\n`);
    session.entries += 1;
}

/**
 * Opens the file of a recording. From the moment it is open a failure is no longer the open's:
 * it goes to `onLost`, so the recording ends where the bar sees it instead of counting lines that
 * no longer reach the file.
 */
function opened(path: string, onLost: (stream: WriteStream) => void): Promise<WriteStream> {
    return new Promise((resolve, reject) => {
        const stream = createWriteStream(path, { encoding: 'utf8' });

        stream.once('open', () => {
            stream.off('error', reject);
            stream.on('error', () => {
                onLost(stream);
            });
            resolve(stream);
        });
        stream.once('error', reject);
    });
}

/**
 * The recording of a connection happens here, in main, as each batch of activity leaves for
 * the window. It cannot happen in the renderer: the timeline is a window with two caps, and a
 * recording taken from it would carry holes exactly in the sessions too busy to fit — the ones
 * worth recording. Every line leaves redacted, like every line the export border writes.
 */
export function createActivityRecorder(deps: ActivityRecorderDeps): ActivityRecorder {
    const running = new Map<string, Running>();
    const limit = deps.queueLimit ?? QUEUE_LIMIT;
    // A connection whose file is still opening: a second start asked meanwhile would open a
    // second file, and the first would stay open with nobody left to close it.
    const opening = new Set<string>();

    function announce(connectionId: string, entries: number, active: boolean): void {
        deps.onState({ active, connectionId, entries });
    }

    /** Ends a recording whose file failed after it opened: a disk that filled up or went away. */
    function lose(connectionId: string, stream: WriteStream): void {
        const session = running.get(connectionId);

        if (session?.stream !== stream) {
            return;
        }

        running.delete(connectionId);
        announce(connectionId, session.entries, false);
    }

    async function closeOf(session: Running): Promise<{ entries: number; path: string }> {
        const { entries, path, stream } = session;

        closeGap(session);
        await new Promise<void>((resolve) => {
            stream.end(() => {
                resolve();
            });
        });

        return { entries, path };
    }

    return {
        start: async (connectionId, path) => {
            if (running.has(connectionId) || opening.has(connectionId)) {
                throw new RecordingActiveError(connectionId);
            }

            opening.add(connectionId);

            try {
                const stream = await opened(path, (lost) => {
                    lose(connectionId, lost);
                });

                running.set(connectionId, { entries: 0, gap: null, path, stream });
                announce(connectionId, 0, true);
            } finally {
                opening.delete(connectionId);
            }
        },
        stop: async (connectionId) => {
            const session = running.get(connectionId);

            if (session === undefined) {
                return undefined;
            }

            running.delete(connectionId);
            announce(connectionId, session.entries, false);

            return closeOf(session);
        },
        status: (connectionId) => {
            const session = running.get(connectionId);

            return session === undefined
                ? { active: false, entries: 0 }
                : { active: true, entries: session.entries };
        },
        write: (push) => {
            const session = running.get(push.connectionId);

            if (session === undefined) {
                return;
            }

            for (const line of push.records) {
                record(session, line, limit);
            }

            announce(push.connectionId, session.entries, true);
        },
        disposeAll: async () => {
            const closing = [...running.values()].map((session) => closeOf(session));

            running.clear();

            await Promise.all(closing);
        },
    };
}
