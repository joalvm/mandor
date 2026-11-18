import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createWorkspace, writeDoc, writeGlobals, writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { workspaceDataOf } from '../../src/export/workspace-data-of.js';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-data-docs-'));
    await writeRepoTree(dir, 'Demo');
    await createWorkspace(dir, { id: 'tienda', name: 'Tienda', kind: 'sync' });
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe('the docs and variables of a workspace as the codec receives them', () => {
    it('reads each doc by its file, its title and the text exactly as it sits on disk', async () => {
        const guia = '---\ntitle: Guía de uso\n---\n# Guía\n\nPrimero, el token.\n';

        await writeDoc(dir, 'tienda', 'k3m9x2q7a4bd.md', guia);
        await writeDoc(dir, 'tienda', 'alta.md', 'Alta de clientes\n');

        const data = await workspaceDataOf(dir, 'tienda');

        expect(data.docs).toEqual([
            { name: 'alta.md', title: 'alta', text: 'Alta de clientes\n' },
            { name: 'k3m9x2q7a4bd.md', title: 'Guía de uso', text: guia },
        ]);
    });

    it('has no docs for a workspace that never wrote one', async () => {
        const data = await workspaceDataOf(dir, 'tienda');

        expect(data.docs).toEqual([]);
    });

    it('reads the globals of the origin, a secret without its value', async () => {
        const variable = {
            name: 'baseUrl',
            value: 'https://api.test',
            enabled: true,
            secret: false,
        };

        const token = { name: 'token', value: 's3cr3t', enabled: true, secret: true };

        await writeGlobals(dir, { variables: [variable, token] });

        const data = await workspaceDataOf(dir, 'tienda');

        expect(data.globals).toEqual([variable, { ...token, value: '' }]);
    });

    it('has no globals for an origin that never saved them', async () => {
        const data = await workspaceDataOf(dir, 'tienda');

        expect(data.globals).toEqual([]);
    });
});
