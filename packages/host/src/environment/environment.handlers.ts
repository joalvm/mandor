import {
    CHANNELS,
    environmentCreateRequestSchema,
    environmentDeleteRequestSchema,
    environmentListRequestSchema,
    environmentUpdateRequestSchema,
    failure,
    success,
    type Empty,
    type EnvironmentChanges,
    type Result,
} from '@mandor/ipc';
import { createEnvironment as makeEnvironment, newId, type Environment } from '@mandor/schema';
import {
    deleteEnvironment as dropEnvironment,
    listEnvironments as readEnvironments,
    type EnvironmentPatch,
    environmentFile,
    readEnvironment,
    readTextOrNull,
    writeEnvironment,
} from '@mandor/store-fs';

import { failureOf } from '../ipc/failure-of.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { rootedHandler } from '../ipc/rooted-handler.js';
import { reportUnreadable, type UnreadableDeps } from '../notice/unreadable-files.js';
import { activeRepo } from '../origin/active-repo.js';
import { rememberText } from '../repo/known-texts.js';
import { nameOnDisk } from '../repo/name-on-disk.js';
import { reshapeRepo } from '../repo/reshape-repo.js';
import { registerActiveEnvironmentHandlers } from './active-environment.handlers.js';
import { environmentPath, saveEnvironment } from './save-environment.js';

/** Where the values of the secret variables go, which is never the repo. */
export type EnvironmentHandlerDeps = UnreadableDeps & {
    userDataDir: string;
};

export function registerEnvironmentHandlers(
    ipc: HandlerIpc,
    deps: EnvironmentHandlerDeps,
): () => void {
    const disposeActive = registerActiveEnvironmentHandlers(ipc);

    ipc.handle(CHANNELS.environmentCreate, (_event, raw) => createChannel(raw));
    ipc.handle(CHANNELS.environmentList, (_event, raw) => listChannel(deps)(raw));
    ipc.handle(CHANNELS.environmentUpdate, (_event, raw) => updateEnvironment(deps, raw));
    ipc.handle(CHANNELS.environmentDelete, (_event, raw) => deleteChannel(raw));

    return () => {
        disposeActive();
        ipc.removeHandler(CHANNELS.environmentCreate);
        ipc.removeHandler(CHANNELS.environmentList);
        ipc.removeHandler(CHANNELS.environmentUpdate);
        ipc.removeHandler(CHANNELS.environmentDelete);
    };
}

const createChannel = rootedHandler(
    environmentCreateRequestSchema,
    async (root, { workspaceId, name }): Promise<Environment> => {
        const environment = makeEnvironment({ id: newId(), name });

        await reshapeRepo(
            {
                root,
                paths: [environmentPath(root, workspaceId, environment.id)],
                change: { kind: 'create-environment', name: environment.name },
            },
            () => writeEnvironment(root, workspaceId, environment),
        );

        return environment;
    },
);

function listChannel({ notices, logger }: UnreadableDeps) {
    return rootedHandler(environmentListRequestSchema, async (root, { workspaceId }) => {
        const { environments, warnings } = await readEnvironments(root, workspaceId);

        reportUnreadable(notices, logger, warnings);

        for (const { id } of environments) {
            const text = await readTextOrNull(environmentFile(root, workspaceId, id));

            rememberText(root, environmentPath(root, workspaceId, id), text);
        }

        return environments;
    });
}

async function updateEnvironment(
    deps: EnvironmentHandlerDeps,
    raw: unknown,
): Promise<Result<Environment>> {
    const request = environmentUpdateRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return failure('bad-request', request.error.message);
    }

    if (!repo.ok) {
        return repo;
    }

    try {
        const { workspaceId, environmentId, changes } = request.data;
        const { root } = repo.value;

        await saveEnvironment({
            userDataDir: deps.userDataDir,
            repo: repo.value,
            workspaceId,
            environmentId,
            changes: edited(changes),
        });

        return success(await readEnvironment(root, workspaceId, environmentId));
    } catch (error) {
        return failureOf(error);
    }
}

const deleteChannel = rootedHandler(
    environmentDeleteRequestSchema,
    async (root, { workspaceId, environmentId }): Promise<Empty> => {
        const path = environmentPath(root, workspaceId, environmentId);

        await reshapeRepo(
            {
                root,
                paths: [path],
                // The file is about to go: the name is read while it is still there.
                change: { kind: 'delete-environment', name: await nameOnDisk(root, path) },
            },
            () => dropEnvironment(root, workspaceId, environmentId),
        );

        return {};
    },
);

function edited({ name, variables }: EnvironmentChanges): EnvironmentPatch {
    return {
        ...(name === undefined ? {} : { name }),
        ...(variables === undefined ? {} : { variables }),
    };
}
