import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { initRepo } from '@mandor/git';
import { CHANNELS, type ListedDoc, type Result } from '@mandor/ipc';
import { createWorkspace, docsDir, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerDocHandlers } from '../../src/doc/doc.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { copiedRepo } from '../support/copied-repo.js';

const WORKSPACE = { workspaceId: 'api-de-pagos' };

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

async function writeDoc(name: string, text: string): Promise<void> {
    await mkdir(docsDir(root, WORKSPACE.workspaceId), { recursive: true });
    await writeFile(join(docsDir(root, WORKSPACE.workspaceId), name), text, 'utf8');
}

function list(payload: unknown): Promise<Result<ListedDoc[]>> {
    return ipc.call(CHANNELS.docList, payload) as Promise<Result<ListedDoc[]>>;
}

function read(payload: unknown): Promise<Result<string>> {
    return ipc.call(CHANNELS.docRead, payload) as Promise<Result<string>>;
}

describe('listing the docs of a workspace from the renderer', () => {
    it('answers with each file and its title, sorted by title', async () => {
        await writeDoc('zeta.md', '# Zeta');
        await writeDoc('k3m9x2q7a4bd.md', '---\ntitle: Alfa\n---\n# Alfa');

        await expect(list(WORKSPACE)).resolves.toEqual({
            ok: true,
            value: [
                { name: 'k3m9x2q7a4bd.md', title: 'Alfa' },
                { name: 'zeta.md', title: 'zeta' },
            ],
        });
    });

    it('refuses a workspace that is not one id', async () => {
        await expect(list({ workspaceId: '../etc' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});

describe('reading one doc from the renderer', () => {
    it('answers with the text on disk', async () => {
        await writeDoc('readme.md', '# Título\n');

        await expect(read({ ...WORKSPACE, name: 'readme.md' })).resolves.toEqual({
            ok: true,
            value: '# Título\n',
        });
    });

    /** The title belongs to the list and the tab; the editor opens on what comes after it. */
    it('answers with the body and keeps the front matter to itself', async () => {
        await writeDoc('readme.md', '---\ntitle: Léeme\n---\n# Título\n');

        await expect(read({ ...WORKSPACE, name: 'readme.md' })).resolves.toEqual({
            ok: true,
            value: '# Título\n',
        });
    });

    /** A name is checked at the border of main, before anything of it reaches `join`. */
    it('refuses a name that walks out of the docs folder', async () => {
        await expect(read({ ...WORKSPACE, name: '../workspace.yaml' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });

    it('reports a doc that is not there instead of throwing', async () => {
        await expect(read({ ...WORKSPACE, name: 'missing.md' })).resolves.toMatchObject({
            ok: false,
        });
    });
});

describe('a window between origins', () => {
    it('is told there is nowhere to read from', async () => {
        setActiveOrigin(null);

        await expect(list(WORKSPACE)).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });
});
