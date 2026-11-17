import type { RepoChange } from '@mandor/git';
import {
    CHANNELS,
    environmentDefaultLoadRequestSchema,
    environmentDefaultSaveRequestSchema,
    failure,
    success,
    type Empty,
    type Result,
} from '@mandor/ipc';
import { readWorkspace, workspaceFile, writeDefaultEnvironment } from '@mandor/store-fs';

import { failureOf } from '../ipc/failure-of.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { activeRepo } from '../origin/active-repo.js';
import { nameOnDisk } from '../repo/name-on-disk.js';
import { repoRelative } from '../repo/repo-relative.js';
import { writeInRepo } from '../repo/write-in-repo.js';

/**
 * The environment a workspace takes when nobody chose one. Unlike the choice of this machine,
 * it lives in `workspace.yaml` and travels with the origin, so a write is a commit.
 */
export function registerDefaultEnvironmentHandlers(ipc: HandlerIpc): () => void {
    ipc.handle(CHANNELS.environmentDefaultLoad, (_event, raw) => load(raw));
    ipc.handle(CHANNELS.environmentDefaultSave, (_event, raw) => save(raw));

    return () => {
        ipc.removeHandler(CHANNELS.environmentDefaultLoad);
        ipc.removeHandler(CHANNELS.environmentDefaultSave);
    };
}

async function load(raw: unknown): Promise<Result<{ environmentId: string | null }>> {
    const request = environmentDefaultLoadRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!repo.ok) {
        return repo;
    }

    const read = await readWorkspace(repo.value.root, request.data.workspaceId);

    // A workspace file that does not load has no default: nothing rules without a choice.
    return success({ environmentId: read.ok ? (read.value.defaultEnvironment ?? null) : null });
}

async function save(raw: unknown): Promise<Result<Empty>> {
    const request = environmentDefaultSaveRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!repo.ok) {
        return repo;
    }

    try {
        const { root } = repo.value;
        const { workspaceId, environmentId } = request.data;
        const path = repoRelative(root, workspaceFile(root, workspaceId));

        await writeInRepo(
            {
                root,
                path,
                // Started here, awaited after the turn: the next choice is not overtaken by this read.
                change: nameOnDisk(root, path).then((name): RepoChange => ({
                    kind: 'set-default-environment',
                    name,
                })),
            },
            () => writeDefaultEnvironment(root, workspaceId, environmentId),
        );

        return success({});
    } catch (error) {
        return failureOf(error);
    }
}
