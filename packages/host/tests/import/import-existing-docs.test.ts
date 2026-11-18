import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, writeRepoTree, writeDoc } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { existingResourcesOf } from '../../src/import/import-existing.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-existing-docs-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'pasarela', name: 'Pasarela', kind: 'async' });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the docs existingResourcesOf sees', () => {
    it('lists each note by the name of its file, with no origin: a person wrote it', async () => {
        await writeDoc(root, 'pasarela', 'guia.md', '# Guía');
        await writeDoc(root, 'pasarela', 'alta.md', '# Alta');

        const docs = (await existingResourcesOf(root, 'pasarela')).filter(
            (resource) => resource.place === 'doc',
        );

        expect(docs).toEqual([
            { place: 'doc', route: 'alta.md', name: 'alta' },
            { place: 'doc', route: 'guia.md', name: 'guia' },
        ]);
    });
});
