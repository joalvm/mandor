import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { IdError } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createWorkspace, docsDir, writeRepoTree, readDoc, writeDoc } from '../../src/index.js';

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

describe('writing a doc of a workspace', () => {
    /** There is no save button, so the first keystroke has to be able to create the folder. */
    it('creates the docs folder when the workspace has none yet', async () => {
        await writeDoc(root, WORKSPACE, DOC, '# Notas\n');

        expect(await readDoc(root, WORKSPACE, DOC)).toBe('# Notas\n');
    });

    it('replaces the text a doc had', async () => {
        await writeDoc(root, WORKSPACE, DOC, 'Primera versión.\n');
        await writeDoc(root, WORKSPACE, DOC, 'Segunda versión.\n');

        expect(await readDoc(root, WORKSPACE, DOC)).toBe('Segunda versión.\n');
    });

    /** The write goes through a sibling temporary, and the sibling does not outlive the rename. */
    it('leaves nothing beside the doc it wrote', async () => {
        await writeDoc(root, WORKSPACE, DOC, '# Notas\n');

        expect(await readdir(docsDir(root, WORKSPACE))).toEqual([DOC]);
    });

    it('writes the text as utf8', async () => {
        await writeDoc(root, WORKSPACE, DOC, 'Configuración: sí\n');

        expect(await readFile(join(docsDir(root, WORKSPACE), DOC), 'utf8')).toBe(
            'Configuración: sí\n',
        );
    });

    /** The editor never sees the title, so what it sends back cannot carry it. */
    it('keeps the front matter a doc has when the body is replaced', async () => {
        await writeDoc(root, WORKSPACE, DOC, '---\ntitle: Notas\n---\nPrimera.\n');
        await writeDoc(root, WORKSPACE, DOC, 'Segunda.\n');

        expect(await readDoc(root, WORKSPACE, DOC)).toBe('---\ntitle: Notas\n---\nSegunda.\n');
    });

    /** The name arrives from a link or a list, so it is doubted before it becomes a path. */
    it('refuses a name that climbs out of the docs folder', async () => {
        await expect(writeDoc(root, WORKSPACE, '../mandor.yaml', 'roto')).rejects.toBeInstanceOf(
            IdError,
        );
    });
});
