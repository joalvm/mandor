import { rm } from 'node:fs/promises';

import { commitAll, initRepo } from '@mandor/git';
import { CHANNELS, type Empty, type Result } from '@mandor/ipc';
import { createWorkspace, inTurn, writeRepoTree, readDoc } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerDocHandlers } from '../../src/doc/doc.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { copiedRepo } from '../support/copied-repo.js';

const WORKSPACE = { workspaceId: 'api-de-pagos' };
const DOC = 'notas.md';

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

const freshRepo = copiedRepo(async (root) => {
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'api-de-pagos', name: 'API de pagos', kind: 'async' });
    await initRepo(root);
});

beforeEach(async () => {
    root = await freshRepo();
    ipc = spyIpc();
    dispose = registerDocHandlers(ipc);

    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
});

function write(payload: unknown): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.docWrite, payload) as Promise<Result<Empty>>;
}

function revert(payload: unknown): Promise<Result<string>> {
    return ipc.call(CHANNELS.docRevert, payload) as Promise<Result<string>>;
}

describe('writing one doc from the renderer', () => {
    /** Nothing saves in this app, so the first write is also what makes the docs folder. */
    it('puts the text on disk in a workspace that had no docs', async () => {
        await expect(write({ ...WORKSPACE, name: DOC, text: '# Notas\n' })).resolves.toEqual({
            ok: true,
            value: {},
        });
        expect(await readDoc(root, WORKSPACE.workspaceId, DOC)).toBe('# Notas\n');
    });

    /** A name is doubted at the border of main, before anything of it reaches a path. */
    it('refuses a name that walks out of the docs folder', async () => {
        await expect(
            write({ ...WORKSPACE, name: '../workspace.yaml', text: 'roto' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('is told there is nowhere to write when the window sits between origins', async () => {
        setActiveOrigin(null);

        await expect(write({ ...WORKSPACE, name: DOC, text: 'x' })).resolves.toMatchObject({
            ok: false,
        });
    });
});

describe('taking one doc back to its last commit', () => {
    /** A doc is committed with the rest of the repo, and the revert is measured against that. */
    it('answers with the text of the last commit', async () => {
        await write({ ...WORKSPACE, name: DOC, text: 'La primera versión.\n' });
        await commitAll(root, 'write docs');
        await write({ ...WORKSPACE, name: DOC, text: 'Un desastre.\n' });

        await expect(revert({ ...WORKSPACE, name: DOC })).resolves.toEqual({
            ok: true,
            value: 'La primera versión.\n',
        });
        expect(await readDoc(root, WORKSPACE.workspaceId, DOC)).toBe('La primera versión.\n');
    });

    /** An edit still waiting for its turn when the revert arrives is one the revert throws away. */
    it('takes back an edit that was still waiting for its turn when the revert arrived', async () => {
        let release = (): void => undefined;
        const held = new Promise<void>((resolve) => {
            release = resolve;
        });

        await write({ ...WORKSPACE, name: DOC, text: 'La primera versión.\n' });
        await commitAll(root, 'write docs');

        const busy = inTurn(root, () => held);
        const late = write({ ...WORKSPACE, name: DOC, text: 'Un desastre.\n' });
        const reverted = revert({ ...WORKSPACE, name: DOC });

        release();
        await Promise.all([busy, late]);

        await expect(reverted).resolves.toEqual({ ok: true, value: 'La primera versión.\n' });
        expect(await readDoc(root, WORKSPACE.workspaceId, DOC)).toBe('La primera versión.\n');
    });

    it('reports a doc the history never saw instead of emptying it', async () => {
        await expect(revert({ ...WORKSPACE, name: 'nunca.md' })).resolves.toMatchObject({
            ok: false,
        });
    });
});
