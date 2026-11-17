import { rm, writeFile } from 'node:fs/promises';

import { commitAll, initRepo } from '@mandor/git';
import { CHANNELS } from '@mandor/ipc';
import {
    createWorkspace,
    docFile,
    writeRepoTree,
    listConflicts,
    readDoc,
    writeDoc,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerDocHandlers } from '../../src/doc/doc.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { flushAllCommits } from '../../src/repo/commit-scheduler.js';
import { forgetTexts } from '../../src/repo/known-texts.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';
import { copiedRepo } from '../support/copied-repo.js';

const WORKSPACE = { workspaceId: 'api-de-pagos' };
const DOC = 'notas.md';
const BASE = 'uno\ndos\ntres\ncuatro\ncinco\nseis\nsiete\n';

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
    await writeDoc(root, WORKSPACE.workspaceId, DOC, BASE);
    await commitAll(root, 'Doc');
});

afterEach(async () => {
    await flushAllCommits();

    dispose();
    setActiveOrigin(null);

    await rm(root, { recursive: true, force: true });
});

function read(): Promise<unknown> {
    return ipc.call(CHANNELS.docRead, { ...WORKSPACE, name: DOC });
}

function write(text: string): Promise<unknown> {
    return ipc.call(CHANNELS.docWrite, { ...WORKSPACE, name: DOC, text });
}

function theirs(text: string): Promise<void> {
    return writeFile(docFile(root, WORKSPACE.workspaceId, DOC), text, 'utf8');
}

describe('writing a doc the window read before the file changed', () => {
    it('keeps a colleague line far from the one the window edited', async () => {
        await read();
        await theirs(BASE.replace('siete', 'siete\nocho'));

        await write(BASE.replace('uno', 'UNO'));

        expect(await readDoc(root, WORKSPACE.workspaceId, DOC)).toBe(
            BASE.replace('uno', 'UNO').replace('siete', 'siete\nocho'),
        );
        expect((await listConflicts(root)).conflicts).toEqual([]);
    });

    it('keeps the window text and records the clash on the same line', async () => {
        await read();
        await theirs(BASE.replace('uno', 'ONE'));

        await write(BASE.replace('uno', 'UNO'));

        const { conflicts } = await listConflicts(root);

        expect(await readDoc(root, WORKSPACE.workspaceId, DOC)).toContain('UNO');
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0]?.record).toMatchObject({ source: 'write', base: BASE });
    });

    it('writes as always when the window never read the doc', async () => {
        forgetTexts(root);
        await theirs(BASE.replace('uno', 'ONE'));

        await write(BASE.replace('uno', 'UNO'));

        expect(await readDoc(root, WORKSPACE.workspaceId, DOC)).toBe(BASE.replace('uno', 'UNO'));
        expect((await listConflicts(root)).conflicts).toEqual([]);
    });
});
