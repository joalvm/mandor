import {
    activeEnvironmentsSchema,
    CHANNELS,
    environmentActiveLoadRequestSchema,
    environmentActiveSaveRequestSchema,
    failure,
    success,
    type ActiveEnvironments,
    type Empty,
    type Result,
} from '@mandor/ipc';
import {
    activeEnvironmentsFile,
    inTurn,
    readActiveEnvironments,
    writeActiveEnvironments,
} from '@mandor/store-fs';

import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { activeOriginRoot } from '../origin/active-origin.js';

export function registerActiveEnvironmentHandlers(ipc: HandlerIpc): () => void {
    ipc.handle(CHANNELS.environmentActiveLoad, (_event, raw) => loadActive(raw));
    ipc.handle(CHANNELS.environmentActiveSave, (_event, raw) => saveActive(raw));

    return () => {
        ipc.removeHandler(CHANNELS.environmentActiveLoad);
        ipc.removeHandler(CHANNELS.environmentActiveSave);
    };
}

async function loadActive(raw: unknown): Promise<Result<ActiveEnvironments>> {
    const request = environmentActiveLoadRequestSchema.safeParse(raw ?? {});
    const root = activeOriginRoot();

    if (!request.success || root === null) {
        return failure('bad-request', 'active environment cannot be loaded');
    }

    try {
        return success(await storedChoices(root));
    } catch (error) {
        return failure('fs-read', String(error));
    }
}

async function saveActive(raw: unknown): Promise<Result<Empty>> {
    const request = environmentActiveSaveRequestSchema.safeParse(raw);
    const root = activeOriginRoot();

    if (!request.success || root === null) {
        return failure('bad-request', 'active environment cannot be saved');
    }

    const { workspaceId, environmentId } = request.data;

    try {
        // One file holds every workspace's choice: two saves that overlap would each write the
        // copy they read, and the later one would drop what the earlier one set.
        await inTurn(activeEnvironmentsFile(root), async () => {
            const stored = await storedChoices(root);

            await writeActiveEnvironments(root, changed(stored, workspaceId, environmentId));
        });

        return success({});
    } catch (error) {
        return failure('fs-write', String(error));
    }
}

/**
 * The choices on disk that still read as one: a workspace and the environment it picked. What
 * a hand or a crash left as anything else is dropped, so it never stands in the way of the rest.
 */
async function storedChoices(root: string): Promise<ActiveEnvironments> {
    const stored = await readActiveEnvironments(root);

    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
        return {};
    }

    const kept = Object.entries(stored).filter(
        ([workspaceId, environmentId]: [string, unknown]) =>
            activeEnvironmentsSchema.safeParse({ [workspaceId]: environmentId }).success,
    );

    return activeEnvironmentsSchema.parse(Object.fromEntries(kept));
}

function changed(
    active: ActiveEnvironments,
    workspaceId: string,
    environmentId: string | null,
): ActiveEnvironments {
    if (environmentId !== null) {
        return { ...active, [workspaceId]: environmentId };
    }

    return Object.fromEntries(Object.entries(active).filter(([id]) => id !== workspaceId));
}
