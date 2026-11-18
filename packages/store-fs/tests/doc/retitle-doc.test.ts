import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    createWorkspace,
    docsDir,
    readDoc,
    retitleDoc,
    writeDoc,
    writeRepoTree,
} from '../../src/index.js';

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

describe('retitling a doc', () => {
    it('writes the title in the front matter and answers with the text it holds', async () => {
        await writeDoc(root, WORKSPACE, DOC, '# Hola\n');

        const text = await retitleDoc(root, WORKSPACE, DOC, 'Notas');

        expect(text).toBe('---\ntitle: Notas\n---\n# Hola\n');
        expect(await readDoc(root, WORKSPACE, DOC)).toBe(text);
    });

    it('replaces an earlier title and leaves the file where it was', async () => {
        await writeDoc(root, WORKSPACE, DOC, '---\ntitle: Notas\n---\nCuerpo\n');
        await retitleDoc(root, WORKSPACE, DOC, 'Ideas');

        expect(await readDoc(root, WORKSPACE, DOC)).toBe('---\ntitle: Ideas\n---\nCuerpo\n');
        expect(await readdir(docsDir(root, WORKSPACE))).toEqual([DOC]);
    });
});
