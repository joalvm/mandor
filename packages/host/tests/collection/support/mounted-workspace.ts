import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { commitAll, initRepo } from '@mandor/git';
import { CHANNELS, type CollectionSearchHit, type Result } from '@mandor/ipc';
import type { CollectionItemFields, CollectionNode } from '@mandor/schema';
import { collectionDir, createWorkspace, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach } from 'vitest';

import { registerCollectionHandlers } from '../../../src/collection/collection.handlers.js';
import { setActiveOrigin } from '../../../src/origin/active-origin.js';
import { flushAllCommits } from '../../../src/repo/commit-scheduler.js';
import type { UnreadableDeps } from '../../../src/notice/unreadable-files.js';
import { silentReporting, spyIpc, type IpcSpy } from '../../../src/testing/handler-harness.js';
import { copiedRepo } from '../../support/copied-repo.js';

/** The workspace every collection test of the host speaks about. */
export const WORKSPACE = { workspaceId: 'api-de-pagos' };

/** One call per channel, typed by what the channel answers with. */
export type CollectionCalls = {
    create: (payload: unknown) => Promise<Result<string>>;
    move: (payload: unknown) => Promise<Result<unknown>>;
    remove: (payload: unknown) => Promise<Result<unknown>>;
    renameFolder: (payload: unknown) => Promise<Result<unknown>>;
    renameItem: (payload: unknown) => Promise<Result<unknown>>;
    /** The body of one item, flat, which is the only call in the area that opens a file. */
    readItem: (payload: unknown) => Promise<Result<CollectionItemFields>>;
    reorder: (payload: unknown) => Promise<Result<unknown>>;
    search: (payload: unknown) => Promise<Result<CollectionSearchHit[]>>;
    writeItem: (payload: unknown) => Promise<Result<unknown>>;
    /** Where the handlers write, so a test can ask git what one call left in the diff. */
    repo: () => string;
    tree: (payload: unknown) => Promise<Result<CollectionNode[]>>;
};

/**
 * A repository on disk with one folder and two items in it, and the handlers registered over a
 * spy. What every collection test of the host arranges is the same; what changes is what it asks.
 *
 * The repository is built once for the file and copied for each test: building it spawns git a
 * dozen times, copying it spawns it none, and each test still writes to a copy of its own.
 */
export function mountedWorkspace(reporting: UnreadableDeps = silentReporting()): CollectionCalls {
    const freshRepo = copiedRepo(builtRepo);
    let ipc: IpcSpy;
    let dispose: () => void;
    let root: string;

    beforeEach(async () => {
        root = await freshRepo();
        ipc = spyIpc();
        dispose = registerCollectionHandlers(ipc, reporting);
        setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
    });

    afterEach(async () => {
        await flushAllCommits();

        dispose();
        setActiveOrigin(null);

        await rm(root, { recursive: true, force: true });
    });

    return {
        create: (payload) =>
            ipc.call(CHANNELS.collectionCreate, payload) as Promise<Result<string>>,
        move: (payload) => ipc.call(CHANNELS.collectionMove, payload) as Promise<Result<unknown>>,
        remove: (payload) =>
            ipc.call(CHANNELS.collectionDelete, payload) as Promise<Result<unknown>>,
        renameFolder: (payload) =>
            ipc.call(CHANNELS.collectionRenameFolder, payload) as Promise<Result<unknown>>,
        renameItem: (payload) =>
            ipc.call(CHANNELS.collectionRenameItem, payload) as Promise<Result<unknown>>,
        readItem: (payload) =>
            ipc.call(CHANNELS.collectionReadItem, payload) as Promise<Result<CollectionItemFields>>,
        reorder: (payload) =>
            ipc.call(CHANNELS.collectionReorder, payload) as Promise<Result<unknown>>,
        writeItem: (payload) =>
            ipc.call(CHANNELS.collectionWriteItem, payload) as Promise<Result<unknown>>,
        repo: () => root,
        search: (payload) =>
            ipc.call(CHANNELS.collectionSearch, payload) as Promise<Result<CollectionSearchHit[]>>,
        tree: (payload) =>
            ipc.call(CHANNELS.collectionTree, payload) as Promise<Result<CollectionNode[]>>,
    };
}

/** The repository every test starts from, committed and with nothing pending. */
async function builtRepo(root: string): Promise<void> {
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'api-de-pagos', name: 'API de pagos', kind: 'async' });
    await initRepo(root);
    await mountCollection(root);
    await commitAll(root, 'Colecciones');
}

async function mountCollection(root: string): Promise<void> {
    await write(root, 'collections.yaml', 'order:\n  - pedidos\n');
    await write(root, 'pedidos/collection.yaml', 'name: Pedidos\norder:\n  - pedido-creado\n');
    await write(root, 'pedidos/pedido-creado.yaml', 'kind: message\nname: Pedido creado\n');
    await write(root, 'pedidos/pedido-pagado.yaml', 'kind: message\nname: Pedido pagado\n');
}

async function write(root: string, name: string, contents: string): Promise<void> {
    const path = join(collectionDir(root, WORKSPACE.workspaceId), name);

    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, contents, 'utf8');
}
