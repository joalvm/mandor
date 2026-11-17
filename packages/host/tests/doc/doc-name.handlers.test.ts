import { rm } from 'node:fs/promises';

import { initRepo } from '@mandor/git';
import { CHANNELS, type Empty, type Result } from '@mandor/ipc';
import { createWorkspace, listDocs, readDoc, writeRepoTree, writeDoc } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerDocHandlers } from '../../src/doc/doc.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { copiedRepo } from '../support/copied-repo.js';

const WORKSPACE = { workspaceId: 'api-de-pagos' };
const DOC = 'k3m9x2q7a4bd.md';

/** What main draws for the file of a doc: twelve characters of the id alphabet, never the title. */
const MINTED = /^[0-9a-z]{12}\.md$/;

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

function create(payload: unknown): Promise<Result<string>> {
    return ipc.call(CHANNELS.docCreate, payload) as Promise<Result<string>>;
}

function remove(payload: unknown): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.docDelete, payload) as Promise<Result<Empty>>;
}

function rename(payload: unknown): Promise<Result<Empty>> {
    return ipc.call(CHANNELS.docRename, payload) as Promise<Result<Empty>>;
}

describe('creating one doc from the renderer', () => {
    /** The editor fills it: a doc that arrived written would be words nobody chose. */
    it('draws the file itself and leaves a doc with a title and nothing else in it', async () => {
        const made = await create({ ...WORKSPACE, title: 'Notas' });

        expect(made).toMatchObject({ ok: true });

        const name = made.ok ? made.value : '';

        expect(name).toMatch(MINTED);
        expect(await readDoc(root, WORKSPACE.workspaceId, name)).toBe('---\ntitle: Notas\n---\n');
    });

    it('lets two docs wear one title, because the file tells them apart', async () => {
        const first = await create({ ...WORKSPACE, title: 'Notas' });
        const second = await create({ ...WORKSPACE, title: 'Notas' });

        expect(first.ok && second.ok && first.value !== second.value).toBe(true);
        expect(await listDocs(root, WORKSPACE.workspaceId)).toHaveLength(2);
    });

    it('refuses a title nobody can read', async () => {
        await expect(create({ ...WORKSPACE, title: '  ' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('retitling one doc from the renderer', () => {
    it('rewrites the title and keeps the file, its body and its name', async () => {
        await writeDoc(root, WORKSPACE.workspaceId, DOC, '---\ntitle: Notas\n---\n# Cuerpo\n');

        await expect(rename({ ...WORKSPACE, name: DOC, title: 'Guía' })).resolves.toEqual({
            ok: true,
            value: {},
        });
        expect(await listDocs(root, WORKSPACE.workspaceId)).toEqual([{ name: DOC, title: 'Guía' }]);
        expect(await readDoc(root, WORKSPACE.workspaceId, DOC)).toBe(
            '---\ntitle: Guía\n---\n# Cuerpo\n',
        );
    });

    it('reports a doc that is not there instead of throwing', async () => {
        await expect(rename({ ...WORKSPACE, name: DOC, title: 'Guía' })).resolves.toMatchObject({
            ok: false,
        });
    });

    it('refuses a file that walks out of the docs folder', async () => {
        await expect(
            rename({ ...WORKSPACE, name: '../fuera.md', title: 'Guía' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });
});

describe('deleting one doc from the renderer', () => {
    it('takes the file out of the folder', async () => {
        await writeDoc(root, WORKSPACE.workspaceId, DOC, '# Notas\n');

        await expect(remove({ ...WORKSPACE, name: DOC })).resolves.toEqual({ ok: true, value: {} });
        expect(await listDocs(root, WORKSPACE.workspaceId)).toEqual([]);
    });

    it('refuses a name that walks out of the docs folder', async () => {
        await expect(remove({ ...WORKSPACE, name: '../fuera.md' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('a window between origins', () => {
    it('is told there is nowhere to write to', async () => {
        setActiveOrigin(null);

        await expect(create({ ...WORKSPACE, title: 'Notas' })).resolves.toMatchObject({
            ok: false,
        });
    });
});
