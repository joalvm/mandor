import { lastChange } from '@mandor/git';
import {
    CHANNELS,
    workspaceCreateRequestSchema,
    workspaceDeleteRequestSchema,
    workspaceListRequestSchema,
    workspaceRenameRequestSchema,
    type ListedWorkspace,
} from '@mandor/ipc';
import { newId, type Workspace, type WorkspaceKind } from '@mandor/schema';
import {
    createWorkspace as writeWorkspace,
    deleteWorkspace,
    loadRepo,
    renameWorkspace,
    repoFile,
    workspaceDir,
    workspaceFile,
} from '@mandor/store-fs';

import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { rootedHandler } from '../ipc/rooted-handler.js';
import { nameOnDisk } from '../repo/name-on-disk.js';
import { repoRelative } from '../repo/repo-relative.js';
import { reshapeRepo } from '../repo/reshape-repo.js';

export type WorkspaceHandlerDeps = {
    /** The kind of workspace this app hosts. Main stamps it; the renderer never sends it. */
    kind: WorkspaceKind;
    /**
     * What the app keeps of a workspace outside its folder, let go before the folder goes: once
     * it is gone, nothing says what was its. The host does not know what that is.
     */
    forgetWorkspace?: ((root: string, workspaceId: string) => Promise<void>) | undefined;
};

/**
 * The channels a renderer uses to reach the workspaces of the active origin. The kind is
 * not a request field: main stamps it from the app it hosts, and lists only what it can open.
 */
export function registerWorkspaceHandlers(ipc: HandlerIpc, deps: WorkspaceHandlerDeps): () => void {
    ipc.handle(CHANNELS.workspaceCreate, (_event, raw) => createChannel(deps)(raw));
    ipc.handle(CHANNELS.workspaceDelete, (_event, raw) => deleteChannel(deps)(raw));
    ipc.handle(CHANNELS.workspaceList, (_event, raw) => listChannel(deps)(raw ?? {}));
    ipc.handle(CHANNELS.workspaceRename, (_event, raw) => renameChannel(raw));

    return () => {
        ipc.removeHandler(CHANNELS.workspaceCreate);
        ipc.removeHandler(CHANNELS.workspaceDelete);
        ipc.removeHandler(CHANNELS.workspaceList);
        ipc.removeHandler(CHANNELS.workspaceRename);
    };
}

function createChannel(deps: WorkspaceHandlerDeps) {
    return rootedHandler(workspaceCreateRequestSchema, (root, { name }) =>
        reshapeRepo(
            {
                root,
                paths: (made: Workspace) => workspacePlaces(root, made.id),
                change: { kind: 'create-workspace', name },
            },
            () => writeWorkspace(root, { id: newId(), name, kind: deps.kind }),
        ),
    );
}

/** The folder of a workspace and the order of workspaces kept in the repo file. */
function workspacePlaces(root: string, workspaceId: string): string[] {
    return [
        repoRelative(root, workspaceDir(root, workspaceId)),
        repoRelative(root, repoFile(root)),
    ];
}

/** Deleting is irreversible, so it lands as its own commit the moment it is done. */
function deleteChannel(deps: WorkspaceHandlerDeps) {
    return rootedHandler(workspaceDeleteRequestSchema, async (root, { id }) => {
        // Once the folder is gone there is no name left to read, so the history asks for it first.
        const name = await nameOnDisk(root, repoRelative(root, workspaceFile(root, id)));

        // Before the change and not inside it: forgetting takes the turn of the origin by itself.
        await deps.forgetWorkspace?.(root, id);
        await reshapeRepo(
            { root, paths: workspacePlaces(root, id), change: { kind: 'delete-workspace', name } },
            () => deleteWorkspace(root, id),
        );

        return {};
    });
}

function listChannel(deps: WorkspaceHandlerDeps) {
    return rootedHandler(workspaceListRequestSchema, async (root): Promise<ListedWorkspace[]> => {
        const opened = await loadRepo(root);
        const ofThisApp = opened.workspaces.filter((workspace) => workspace.kind === deps.kind);

        // The date comes from the history git keeps, in the shape git paths speak.
        return Promise.all(
            ofThisApp.map(async (workspace) => ({
                ...workspace,
                modifiedAt: await lastChange(root, `workspaces/${workspace.id}`),
            })),
        );
    });
}

const renameChannel = rootedHandler(workspaceRenameRequestSchema, (root, { id, name }) =>
    reshapeRepo(
        {
            root,
            paths: [repoRelative(root, workspaceFile(root, id))],
            change: { kind: 'rename-workspace', name },
        },
        () => renameWorkspace(root, id, name),
    ),
);
