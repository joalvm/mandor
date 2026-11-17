import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { IdError } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createDoc,
    createWorkspace,
    docParts,
    writeRepoTree,
    listDocs,
    NameTakenError,
    readDoc,
    writeDoc,
} from '../../src/index.js';

const WORKSPACE = 'eventos-de-pagos';
const DOC = 'notas.md';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('creating a doc of a workspace', () => {
    /** Nothing is written into it but the title: the editor opens on an empty page. */
    it('leaves the new doc with its title and an empty body', async () => {
        await createDoc(root, WORKSPACE, { name: DOC, title: 'Notas' });

        expect(await readDoc(root, WORKSPACE, DOC)).toBe('---\ntitle: Notas\n---\n');
        expect(docParts(await readDoc(root, WORKSPACE, DOC)).body).toBe('');
    });

    it('creates the docs folder when the workspace has none yet', async () => {
        await createDoc(root, WORKSPACE, { name: DOC, title: 'Notas' });

        expect(await listDocs(root, WORKSPACE)).toEqual([{ name: DOC, title: 'Notas' }]);
    });

    /** Creating over a doc that exists would throw away whatever was written in it. */
    it('refuses a name another doc already has, and keeps its text', async () => {
        await writeDoc(root, WORKSPACE, DOC, '# Lo que ya estaba\n');

        await expect(createDoc(root, WORKSPACE, { name: DOC, title: 'Otro' })).rejects.toThrow(
            NameTakenError,
        );
        expect(await readDoc(root, WORKSPACE, DOC)).toBe('# Lo que ya estaba\n');
    });

    it('refuses a name that could reach out of the folder', async () => {
        await expect(
            createDoc(root, WORKSPACE, { name: '../fuera.md', title: 'Fuera' }),
        ).rejects.toThrow(IdError);
    });
});
