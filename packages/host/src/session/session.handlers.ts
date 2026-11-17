import {
    CHANNELS,
    failure,
    restoredUiSessionSchema,
    sessionLoadRequestSchema,
    sessionSaveRequestSchema,
    success,
    type Result,
    type UiSession,
} from '@mandor/ipc';
import { readSession, writeSession } from '@mandor/store-fs';

import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { activeOriginRoot } from '../origin/active-origin.js';

import { trackWrite } from '../runtime/write-drain.js';

export function registerSessionHandlers(ipc: HandlerIpc): () => void {
    ipc.handle(CHANNELS.sessionLoad, (_event, raw) => loadSession(raw));
    ipc.handle(CHANNELS.sessionSave, (_event, raw) => saveSession(raw));

    return () => {
        ipc.removeHandler(CHANNELS.sessionLoad);
        ipc.removeHandler(CHANNELS.sessionSave);
    };
}

async function loadSession(raw: unknown): Promise<Result<UiSession>> {
    const request = sessionLoadRequestSchema.safeParse(raw ?? {});

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const root = activeOriginRoot();

    if (root === null) {
        return failure('bad-request', 'no active origin');
    }

    try {
        const stored = await readSession(root);

        // A session that cannot be read back is not a reason to refuse to open the origin: the
        // schema falls back to one empty group, so the only failure left here is the disk.
        return success(restoredUiSessionSchema.parse(stored));
    } catch (error) {
        return failure('fs-read', String(error));
    }
}

async function saveSession(raw: unknown): Promise<Result<Record<string, never>>> {
    const request = sessionSaveRequestSchema.safeParse(raw);

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    const root = activeOriginRoot();

    if (root === null) {
        return failure('bad-request', 'no active origin');
    }

    try {
        await trackWrite(writeSession(root, request.data.session));

        return success({});
    } catch (error) {
        return failure('fs-write', String(error));
    }
}
