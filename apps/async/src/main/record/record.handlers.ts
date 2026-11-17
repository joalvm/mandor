import type { HandlerIpc } from '@mandor/host';
import {
    CHANNELS,
    failure,
    recordPickRequestSchema,
    recordRevealRequestSchema,
    recordStartRequestSchema,
    recordStatusRequestSchema,
    recordStopRequestSchema,
    success,
    type Empty,
    type Result,
} from '@mandor/ipc';

import type { ActivityRecorder } from './activity-recorder.js';
import { RecordingActiveError } from './recording-active-error.js';

export type RecordHandlerDeps = {
    recorder: ActivityRecorder;
    /** The same save dialog every export uses: the only place a path comes from. */
    chooseSavePath: (suggestedName: string) => Promise<string | null>;
    /** How the system shows one written file where it lives. */
    reveal: (path: string) => void;
};

/**
 * The deps plus the paths the save dialog handed out this session. The window sends the path
 * back to start and to reveal, so main only accepts one it gave itself: a window that names any
 * other could have a recording overwrite any file the user can write.
 */
type RecordContext = RecordHandlerDeps & { chosen: Set<string> };

/**
 * The five channels a recording needs, and the one push it speaks through. The path is asked
 * with the save dialog the user answers; start takes the path that answer produced, so a
 * recording without a user-chosen file never begins. Stop answers where the file stayed and
 * how much it holds, and the folder can be opened from there.
 */
export function registerRecordHandlers(ipc: HandlerIpc, deps: RecordHandlerDeps): () => void {
    const context: RecordContext = { ...deps, chosen: new Set() };

    ipc.handle(CHANNELS.recordPick, (_event, raw) => pick(context, raw));
    ipc.handle(CHANNELS.recordStart, (_event, raw) => start(context, raw));
    ipc.handle(CHANNELS.recordStop, (_event, raw) => stop(deps, raw));
    ipc.handle(CHANNELS.recordStatus, (_event, raw) => Promise.resolve(status(deps.recorder, raw)));
    ipc.handle(CHANNELS.recordReveal, (_event, raw) => Promise.resolve(reveal(context, raw)));

    return () => {
        void deps.recorder.disposeAll();
        ipc.removeHandler(CHANNELS.recordPick);
        ipc.removeHandler(CHANNELS.recordStart);
        ipc.removeHandler(CHANNELS.recordStop);
        ipc.removeHandler(CHANNELS.recordStatus);
        ipc.removeHandler(CHANNELS.recordReveal);
    };
}

async function pick(
    context: RecordContext,
    raw: unknown,
): Promise<Result<{ path: string | null }>> {
    const request = recordPickRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const path = await context.chooseSavePath(request.data.suggestedName);

    if (path !== null) {
        context.chosen.add(path);
    }

    return success({ path });
}

async function start(context: RecordContext, raw: unknown): Promise<Result<Empty>> {
    const request = recordStartRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!context.chosen.has(request.data.path)) {
        return failure('bad-request', 'the save dialog never gave that path');
    }

    try {
        await context.recorder.start(request.data.connectionId, request.data.path);

        return success({});
    } catch (error) {
        // A recording already running is the person's to stop; a file the system would not open
        // (a folder gone since the dialog, a full or read-only disk) is not that.
        const code = error instanceof RecordingActiveError ? 'record-active' : 'fs-write';

        return failure(code, String(error));
    }
}

async function stop(
    deps: RecordHandlerDeps,
    raw: unknown,
): Promise<Result<{ entries: number; path: string }>> {
    const request = recordStopRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const stopped = await deps.recorder.stop(request.data.connectionId);

    if (stopped === undefined) {
        return failure('bad-request', `no recording runs for ${request.data.connectionId}`);
    }

    return success(stopped);
}

function status(
    recorder: ActivityRecorder,
    raw: unknown,
): Result<{ active: boolean; entries: number }> {
    const request = recordStatusRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    return success(recorder.status(request.data.connectionId));
}

function reveal(context: RecordContext, raw: unknown): Result<Empty> {
    const request = recordRevealRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!context.chosen.has(request.data.path)) {
        return failure('bad-request', 'the save dialog never gave that path');
    }

    context.reveal(request.data.path);

    return success({});
}
