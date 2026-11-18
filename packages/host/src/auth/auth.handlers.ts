import type { RepoChange } from '@mandor/git';
import {
    authReadRequestSchema,
    authWriteRequestSchema,
    CHANNELS,
    failure,
    success,
    type PlaceAuth,
    type Empty,
    type Result,
} from '@mandor/ipc';
import { readWorkspace, workspaceFile, writeAuth } from '@mandor/store-fs';

import { failureOf } from '../ipc/failure-of.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { activeRepo } from '../origin/active-repo.js';
import { nameOnDisk } from '../repo/name-on-disk.js';
import { repoRelative } from '../repo/repo-relative.js';
import { writeInRepo } from '../repo/write-in-repo.js';

/**
 * The auth of a workspace of the active origin. The renderer names the workspace; the directory
 * behind it lives here and never crosses the bridge.
 */
export function registerAuthHandlers(ipc: HandlerIpc): () => void {
    ipc.handle(CHANNELS.authRead, (_event, raw) => read(raw));
    ipc.handle(CHANNELS.authWrite, (_event, raw) => write(raw));

    return () => {
        ipc.removeHandler(CHANNELS.authRead);
        ipc.removeHandler(CHANNELS.authWrite);
    };
}

async function read(raw: unknown): Promise<Result<PlaceAuth>> {
    const request = authReadRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!repo.ok) {
        return repo;
    }

    try {
        const read = await readWorkspace(repo.value.root, request.data.workspaceId);

        // A file that cannot be read answers as «no auth written», which is what an editor needs
        // while the file is broken somewhere else.
        return success({ auth: (read.ok ? read.value.auth : undefined) ?? null });
    } catch (error) {
        return failureOf(error);
    }
}

async function write(raw: unknown): Promise<Result<Empty>> {
    const request = authWriteRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!repo.ok) {
        return repo;
    }

    try {
        const { root } = repo.value;
        const { workspaceId, auth } = request.data;
        const path = repoRelative(root, workspaceFile(root, workspaceId));

        await writeInRepo(
            {
                root,
                path,
                // Started here, awaited after the turn: the next save is not overtaken by this read.
                change: nameOnDisk(root, path).then((name): RepoChange => ({
                    kind: 'update-auth',
                    name,
                })),
            },
            () => writeAuth(root, workspaceId, auth),
        );

        return success({});
    } catch (error) {
        return failureOf(error);
    }
}
