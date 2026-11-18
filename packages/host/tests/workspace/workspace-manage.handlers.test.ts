import { rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { initRepo, status } from '@mandor/git';
import { CHANNELS, type Result } from '@mandor/ipc';
import type { Workspace } from '@mandor/schema';
import { inTurn, writeRepoTree } from '@mandor/store-fs';
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

function rename(payload: unknown): Promise<Result<Workspace>> {
    return ipc.call(CHANNELS.workspaceRename, payload) as Promise<Result<Workspace>>;
}

function remove(payload: unknown): Promise<Result<object>> {
    return ipc.call(CHANNELS.workspaceDelete, payload) as Promise<Result<object>>;
}

function exists(...segments: string[]): Promise<boolean> {
    return stat(join(root, ...segments)).then(
        () => true,
        () => false,
    );
}

describe('renaming a workspace from the renderer', () => {
    it('moves the name, keeps the id and leaves nothing pending', async () => {
        const created = await create({ name: 'Eventos' });

        if (created.ok) {
            const result = await rename({ id: created.value.id, name: 'Pagos' });

            expect(result).toEqual({
                ok: true,
                value: { id: created.value.id, kind: 'async', name: 'Pagos' },
            });
            await expect(status(root)).resolves.toMatchObject({ clean: true });
        }
    });

    /** The id and directory stay, so only a name the interface cannot render is refused. */
    it('refuses a name the interface cannot render', async () => {
        const created = await create({ name: 'Eventos' });

        expect(created.ok).toBe(true);

        await expect(
            rename({ id: created.ok ? created.value.id : '', name: '  ' }),
        ).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('deleting a workspace from the renderer', () => {
    it('removes the directory, the order entry and leaves nothing pending', async () => {
        const created = await create({ name: 'Ventas' });

        if (created.ok) {
            const result = await remove({ id: created.value.id });

            expect(result).toEqual({ ok: true, value: {} });
            await expect(exists('workspaces', created.value.id)).resolves.toBe(false);
            await expect(status(root)).resolves.toMatchObject({ clean: true });
        }
    });

    /** What the app keeps of a workspace outside its folder is let go while the folder still says what it was. */
    it('lets the app forget the workspace before its folder goes', async () => {
        const forgotten: [string, string, boolean][] = [];

        dispose();
        dispose = registerWorkspaceHandlers(ipc, {
            kind: 'sync',
            forgetWorkspace: async (at, id) => {
                forgotten.push([at, id, await exists('workspaces', id)]);
            },
        });

        const created = await create({ name: 'Ventas' });

        expect(created.ok).toBe(true);

        const id = created.ok ? created.value.id : '';

        await expect(remove({ id })).resolves.toEqual({ ok: true, value: {} });
        expect(forgotten).toEqual([[root, id, true]]);
    });

    /** Letting go of stored bodies takes the turn of the origin, and a turn is not reentrant. */
    it('forgets the workspace outside the turn the deletion holds', async () => {
        dispose();
        dispose = registerWorkspaceHandlers(ipc, {
            kind: 'sync',
            forgetWorkspace: (at) => inTurn(at, () => Promise.resolve()),
        });

        const created = await create({ name: 'Ventas' });
        const id = created.ok ? created.value.id : '';

        await expect(remove({ id })).resolves.toEqual({ ok: true, value: {} });
        await expect(exists('workspaces', id)).resolves.toBe(false);
    });

    it('refuses to delete while the window has no active origin', async () => {
        setActiveOrigin(null);

        await expect(remove({ id: 'ventas' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});
