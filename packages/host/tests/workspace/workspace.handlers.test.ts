import { rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { initRepo, status } from '@mandor/git';
import { CHANNELS, type ListedWorkspace, type Result } from '@mandor/ipc';
import type { Workspace } from '@mandor/schema';
import { writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { registerWorkspaceHandlers } from '../../src/workspace/workspace.handlers.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { copiedRepo } from '../support/copied-repo.js';

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

const freshRepo = copiedRepo(async (root) => {
    await writeRepoTree(root, 'Demo');
    await initRepo(root);
});

beforeEach(async () => {
    root = await freshRepo();
    ipc = spyIpc();
    dispose = registerWorkspaceHandlers(ipc, { kind: 'async' });

    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
});

function create(payload: unknown): Promise<Result<Workspace>> {
    return ipc.call(CHANNELS.workspaceCreate, payload) as Promise<Result<Workspace>>;
}

function list(): Promise<Result<ListedWorkspace[]>> {
    return ipc.call(CHANNELS.workspaceList) as Promise<Result<ListedWorkspace[]>>;
}

function exists(...segments: string[]): Promise<boolean> {
    return stat(join(root, ...segments)).then(
        () => true,
        () => false,
    );
}

const MINTED = /^[0-9a-hjkmnp-tv-z]{12}$/;

/** The id main minted for a workspace the test just created. */
async function createdId(name: string): Promise<string> {
    const created = await create({ name });

    if (!created.ok) {
        throw new Error('the workspace was not created');
    }

    return created.value.id;
}

describe('creating a workspace from the renderer', () => {
    /** The kind is not a request field: main stamps it from the app it hosts. */
    it('stamps the kind of the app that hosts the handler', async () => {
        await expect(create({ name: 'API de pagos' })).resolves.toEqual({
            ok: true,
            value: {
                id: expect.stringMatching(MINTED) as string,
                kind: 'async',
                name: 'API de pagos',
            },
        });
    });

    it('writes the file of the workspace under the id main minted, not under its name', async () => {
        const id = await createdId('API de pagos');

        expect(await exists('workspaces', id, 'workspace.yaml')).toBe(true);
        expect(await exists('workspaces', 'api-de-pagos')).toBe(false);
    });

    it('gives two workspaces of the same name two ids', async () => {
        const first = await createdId('Pagos');
        const second = await createdId('Pagos');

        expect(first).not.toBe(second);
    });

    /** Every write ends in a commit, or the work of the user lives only in the working tree. */
    it('leaves nothing pending behind it', async () => {
        await create({ name: 'API de pagos' });

        await expect(status(root)).resolves.toMatchObject({ clean: true });
    });

    /** The name is data in the file; the path is the minted id, so no name can walk anywhere. */
    it('keeps a name that looks like a path inside the workspaces directory', async () => {
        const id = await createdId('../escape');

        expect(await exists('workspaces', id, 'workspace.yaml')).toBe(true);
        expect(await exists('escape')).toBe(false);
    });

    it('refuses a name with nothing to show', async () => {
        await expect(create({ name: '   ' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });

    /** Workspaces are written in the active origin; without one there is nowhere to write. */
    it('refuses to create while the window has no active origin', async () => {
        setActiveOrigin(null);

        await expect(create({ name: 'API de pagos' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('listing the workspaces from the renderer', () => {
    it('gives back what the repo holds, with when each was last touched', async () => {
        const first = await createdId('Primero');
        const second = await createdId('Segundo');

        await expect(list()).resolves.toEqual({
            ok: true,
            value: [
                {
                    id: first,
                    kind: 'async',
                    name: 'Primero',
                    modifiedAt: expect.any(String) as string,
                },
                {
                    id: second,
                    kind: 'async',
                    name: 'Segundo',
                    modifiedAt: expect.any(String) as string,
                },
            ],
        });
    });

    /** Each app only ever sees the workspaces it knows how to open. */
    it('leaves out the workspaces of the other app', async () => {
        const other = spyIpc();
        const disposeOther = registerWorkspaceHandlers(other, { kind: 'sync' });

        const ofAsync = await createdId('De async');

        await other.call(CHANNELS.workspaceCreate, { name: 'De sync' });

        const listed = await list();

        expect(listed.ok && listed.value.map((workspace) => workspace.id)).toEqual([ofAsync]);

        disposeOther();
    });
});

describe('the disposer of the workspace handlers', () => {
    it('leaves no channel registered', () => {
        expect(ipc.registered()).toEqual([
            CHANNELS.workspaceCreate,
            CHANNELS.workspaceDelete,
            CHANNELS.workspaceList,
            CHANNELS.workspaceRename,
        ]);

        dispose();

        expect(ipc.registered()).toEqual([]);
    });
});
