import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { IdError } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWorkspace, docsDir, readDoc, replaceDoc, writeRepoTree } from '../../src/index.js';

const WORKSPACE = 'eventos-de-pagos';
const DOC = 'k3m9x2q7a4bd.md';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, { id: WORKSPACE, name: 'Eventos de pagos', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('replacing the whole text of a doc', () => {
    it('creates the docs folder and keeps the front matter of the text it is given', async () => {
        await replaceDoc(root, WORKSPACE, DOC, '---\ntitle: Notas\n---\n# Hola\n');

        expect(await readDoc(root, WORKSPACE, DOC)).toBe('---\ntitle: Notas\n---\n# Hola\n');
    });

    /** An import brings its own title: the one already on disk goes with the rest of the file. */
    it('does not keep the front matter of the file it replaces', async () => {
        await replaceDoc(root, WORKSPACE, DOC, '---\ntitle: Viejo\n---\nPrimera.\n');
        await replaceDoc(root, WORKSPACE, DOC, '---\ntitle: Nuevo\n---\nSegunda.\n');

        expect(await readDoc(root, WORKSPACE, DOC)).toBe('---\ntitle: Nuevo\n---\nSegunda.\n');
        expect(await readdir(docsDir(root, WORKSPACE))).toEqual([DOC]);
    });

    it('refuses a name that climbs out of the docs folder', async () => {
        await expect(replaceDoc(root, WORKSPACE, '../mandor.yaml', 'roto')).rejects.toBeInstanceOf(
            IdError,
        );
    });
});
